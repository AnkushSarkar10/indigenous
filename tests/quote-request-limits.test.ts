import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import { test } from "node:test";
import { createQuoteRequestLimiter, readLimitedQuoteBody } from "../server/utils/quote-request-limits";

Object.assign(globalThis, {
  setHeader: (event: { responseHeaders: Record<string, string> }, name: string, value: unknown) => { event.responseHeaders[name.toLowerCase()] = String(value); },
  createError: (details: { statusCode: number; statusMessage: string }) => Object.assign(new Error(details.statusMessage), details),
});

test("limits attempts per IP, reports retry time, and resets only at the window boundary", () => {
  let now = 0;
  const allow = createQuoteRequestLimiter({ maxRequests: 2, windowMs: 10_000, maxTrackedClients: 10 }, () => now);
  assert.equal(allow("192.0.2.1").allowed, true);
  assert.equal(allow("192.0.2.1").allowed, true);
  now = 500;
  assert.deepEqual(allow("192.0.2.1"), { allowed: false, retryAfter: 10 });
  assert.equal(allow("192.0.2.2").allowed, true);
  now = 9_999;
  assert.deepEqual(allow("192.0.2.1"), { allowed: false, retryAfter: 1 });
  now = 10_000;
  assert.equal(allow("192.0.2.1").allowed, true);
});

test("normalises IPv4-mapped addresses and bounds tracked clients without evicting active limits", () => {
  let now = 0;
  const allow = createQuoteRequestLimiter({ maxRequests: 1, windowMs: 1000, maxTrackedClients: 1 }, () => now);
  assert.equal(allow("192.0.2.1").allowed, true);
  assert.equal(allow("::ffff:192.0.2.1").allowed, false);
  assert.equal(allow("192.0.2.2").allowed, false);
  assert.equal(allow("192.0.2.1").allowed, false);
  now = 1000;
  assert.equal(allow("192.0.2.2").allowed, true);
});

function eventFor(req: Readable, headers: Record<string, string> = {}) {
  return {
    node: { req: Object.assign(req, { headers }), res: new EventEmitter() },
    responseHeaders: {} as Record<string, string>,
  };
}
const limits = { maxBodyBytes: 8, bodyTimeoutMs: 1000 };
const status = (code: number) => (error: unknown) => (error as { statusCode?: number }).statusCode === code;

test("preserves exact bytes at the body limit across chunk boundaries", async () => {
  const event = eventFor(Readable.from([Buffer.from("{\"a\":"), Buffer.from(" 1}")]));
  const body = await readLimitedQuoteBody(event as never, limits);
  assert.equal(body.toString(), '{"a": 1}');
  assert.equal(body.length, 8);
});

test("rejects a large Content-Length before consuming the stream", async () => {
  const req = new PassThrough();
  const event = eventFor(req, { "content-length": "9" });
  await assert.rejects(readLimitedQuoteBody(event as never, limits), status(413));
  assert.equal(req.listenerCount("data"), 0);
  assert.equal(event.responseHeaders.connection, "close");
  event.node.res.emit("finish");
  assert.equal(req.destroyed, true);
});

test("stops chunked and underreported bodies as soon as actual bytes exceed the cap", async () => {
  for (const headers of [{}, { "content-length": "1" }]) {
    const req = new PassThrough();
    const event = eventFor(req, headers);
    const result = readLimitedQuoteBody(event as never, limits);
    const rejected = assert.rejects(result, status(413));
    req.write(Buffer.from("12345678"));
    req.write(Buffer.from("9"));
    await rejected;
    assert.equal(req.isPaused(), true);
    assert.equal(req.listenerCount("data"), 0);
    event.node.res.emit("finish");
    assert.equal(req.destroyed, true);
  }
});

test("counts UTF-8 bytes instead of characters", async () => {
  const event = eventFor(Readable.from([Buffer.from("é".repeat(5))]));
  await assert.rejects(readLimitedQuoteBody(event as never, limits), status(413));
});

test("times out incomplete bodies and cleans up stream listeners", async () => {
  const req = new PassThrough();
  const event = eventFor(req);
  // Keep the process alive while the reader's unref'ed timeout is being tested.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(readLimitedQuoteBody(event as never, { ...limits, bodyTimeoutMs: 10 }), status(408));
    assert.equal(req.listenerCount("data"), 0);
    event.node.res.emit("finish");
    assert.equal(req.destroyed, true);
  } finally {
    clearTimeout(keepAlive);
    req.destroy();
  }
});

test("aborted reads reject and tolerate a subsequent socket error", async () => {
  const req = new PassThrough();
  const event = eventFor(req);
  const rejected = assert.rejects(readLimitedQuoteBody(event as never, limits), status(400));
  req.emit("aborted");
  req.emit("error", new Error("Connection reset"));
  await rejected;
  event.node.res.emit("finish");
});
