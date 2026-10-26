import { Resend, type CreateEmailOptions } from "resend";
import { prisma } from "./db";

const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
type SendEmail = Resend["emails"]["send"];

// Durable rows and a conditional claim allow multiple server instances to run
// this worker. The provider key also protects retries after a process crash.
export async function deliverQuoteEmails(apiKey: string | undefined, reference?: string, send?: SendEmail, clock = () => new Date()) {
  if (!apiKey) return { sent: 0, failed: 0 };
  const client = new Resend(apiKey);
  const sender = send ?? client.emails.send.bind(client.emails);
  const jobs = prisma.quoteConfirmationEmail;
  const now = clock();
  await jobs.updateMany({
    where: { status: "pending", firstAttemptAt: { lte: new Date(now.getTime() - RETRY_WINDOW_MS) } },
    data: { status: "review", lastError: "Automatic retry window expired; check provider delivery before resending." },
  });
  const pending = await jobs.findMany({
    where: { status: "pending", nextAttemptAt: { lte: now }, ...(reference ? { quoteRequest: { reference } } : {}) },
    orderBy: { nextAttemptAt: "asc" }, take: 10,
  });
  let sent = 0;
  let failed = 0;
  for (const job of pending) {
    const attemptTime = clock();
    const claimed = await jobs.updateMany({
      where: { quoteRequestId: job.quoteRequestId, status: "pending", nextAttemptAt: { lte: attemptTime } },
      data: { attempts: { increment: 1 }, firstAttemptAt: job.firstAttemptAt ?? attemptTime, nextAttemptAt: new Date(attemptTime.getTime() + 60_000) },
    });
    if (!claimed.count) continue;
    let result: Awaited<ReturnType<SendEmail>>;
    try {
      result = await sender(job.payload as unknown as CreateEmailOptions, {
        idempotencyKey: `quote-confirmation/${job.quoteRequestId}`,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // SDK API errors use result.error; this catches network-level exceptions.
      result = { data: null, error: { name: "application_error", message: "Network failure", statusCode: null }, headers: null };
    }
    if (!result.error && result.data) {
      await jobs.update({ where: { quoteRequestId: job.quoteRequestId }, data: { status: "sent", providerMessageId: result.data.id, sentAt: new Date(), lastError: null } });
      console.info("Quote confirmation accepted by Resend", { quoteRequestId: job.quoteRequestId, emailId: result.data.id });
      sent++;
      continue;
    }
    const error = result.error;
    const retryable = !error?.statusCode || error.statusCode === 429 || error.statusCode >= 500;
    const retryAfter = result.headers?.["retry-after"];
    const providerDelay = retryAfter ? (/^\d+(\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - attemptTime.getTime()) : 0;
    const delay = Math.max(60_000, Math.min(2 ** Math.min(job.attempts, 10) * 60_000, 60 * 60_000), Number.isFinite(providerDelay) ? providerDelay : 0);
    await jobs.update({ where: { quoteRequestId: job.quoteRequestId }, data: {
      status: retryable ? "pending" : "failed",
      nextAttemptAt: new Date(attemptTime.getTime() + delay),
      // Avoid storing provider messages, which can contain addresses or secrets.
      lastError: `${error?.name ?? "empty_response"} (${error?.statusCode ?? "network"})`,
    } });
    console.warn("Quote confirmation could not be sent", { quoteRequestId: job.quoteRequestId, error: error?.name, statusCode: error?.statusCode });
    failed++;
  }
  return { sent, failed };
}
