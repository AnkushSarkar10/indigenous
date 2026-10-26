import type { H3Event } from "h3";

export const QUOTE_REQUEST_LIMITS = {
  maxBodyBytes: 256 * 1024,
  maxRequests: 10,
  windowMs: 10 * 60 * 1000,
  maxTrackedClients: 10_000,
  bodyTimeoutMs: 15_000,
} as const;

export function createQuoteRequestLimiter(
  limits: { maxRequests: number; windowMs: number; maxTrackedClients: number } = QUOTE_REQUEST_LIMITS,
  now: () => number = Date.now,
) {
  const clients = new Map<string, { count: number; expiresAt: number }>();
  let nextCleanup = 0;

  return (client: string) => {
    const time = now();
    if (time >= nextCleanup) {
      for (const [key, entry] of clients) {
        if (entry.expiresAt <= time) clients.delete(key);
      }
      nextCleanup = time + Math.min(limits.windowMs, 60_000);
    }

    // Treat IPv4 and IPv4-mapped IPv6 addresses as the same client.
    const key = client.replace(/^::ffff:/i, "");
    let entry = clients.get(key);
    if (entry && entry.expiresAt <= time) {
      clients.delete(key);
      entry = undefined;
    }
    if (!entry) {
      // Fail closed at capacity instead of evicting active rate-limit buckets.
      if (clients.size >= limits.maxTrackedClients) {
        return { allowed: false, retryAfter: Math.ceil(limits.windowMs / 1000) };
      }
      entry = { count: 0, expiresAt: time + limits.windowMs };
      clients.set(key, entry);
    }
    const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - time) / 1000));
    if (entry.count >= limits.maxRequests) return { allowed: false, retryAfter };
    entry.count++;
    return { allowed: true, retryAfter: 0 };
  };
}

export function closeUnreadQuoteRequest(event: H3Event) {
  const { req, res } = event.node;
  req.pause();
  // A socket may emit an error after its aborted event.
  req.once("error", () => {});
  // Allow the error response to flush before closing a partially read request.
  setHeader(event, "Connection", "close");
  res.once("finish", () => req.destroy());
}

/** Read only a bounded amount of the incoming Node HTTP request. */
export async function readLimitedQuoteBody(
  event: H3Event,
  limits: { maxBodyBytes: number; bodyTimeoutMs: number } = QUOTE_REQUEST_LIMITS,
): Promise<Buffer> {
  const { req } = event.node;
  const tooLarge = () => createError({ statusCode: 413, statusMessage: "Your request is too large. Please reduce your items or notes and try again." });
  const declaredLength = req.headers["content-length"];
  if (declaredLength !== undefined && Number(declaredLength) > limits.maxBodyBytes) {
    closeUnreadQuoteRequest(event);
    throw tooLarge();
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => {
      fail(createError({ statusCode: 408, statusMessage: "Your request took too long. Please try again." }));
    }, limits.bodyTimeoutMs);
    timer.unref();

    const cleanup = () => {
      clearTimeout(timer);
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
      req.off("aborted", onAborted);
    };
    const fail = (error: Error) => {
      cleanup();
      chunks.length = 0;
      closeUnreadQuoteRequest(event);
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > limits.maxBodyBytes) {
        fail(tooLarge());
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks, size));
    };
    const onError = () => fail(createError({ statusCode: 400, statusMessage: "Your request could not be read. Please try again." }));
    const onAborted = () => fail(createError({ statusCode: 400, statusMessage: "Your request was interrupted. Please try again." }));
    req.on("data", onData);
    req.once("end", onEnd);
    req.once("error", onError);
    req.once("aborted", onAborted);
    if (req.destroyed || req.readableEnded) onAborted();
  });
}
