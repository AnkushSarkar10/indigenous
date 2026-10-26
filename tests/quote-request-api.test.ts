import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { test, type TestContext } from "node:test";

// Supply plain delegates through the existing development cache before importing
// the handler. No real Prisma client or database connection is created.
Object.assign(globalThis, {
  prisma: {
    quoteRequest: {
      findUnique: async () => { throw new Error("Unexpected database read"); },
      create: async () => { throw new Error("Unexpected database write"); },
    },
    product: { findMany: async () => { throw new Error("Unexpected product lookup"); } },
  },
  defineEventHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => ({ quoteRequestTrustProxy: false }),
  getRequestIP: (event: { node: { req: { socket: { remoteAddress: string }; headers: Record<string, string> } } }, options: { xForwardedFor: boolean }) =>
    options.xForwardedFor ? event.node.req.headers["x-forwarded-for"] || event.node.req.socket.remoteAddress : event.node.req.socket.remoteAddress,
  setHeader: (event: { responseHeaders: Record<string, string> }, name: string, value: unknown) => { event.responseHeaders[name.toLowerCase()] = String(value); },
  createError: (details: { statusCode: number; statusMessage: string }) => Object.assign(new Error(details.statusMessage), details),
});
const { prisma } = await import("../server/utils/db");
const { default: handler } = await import("../server/api/quote-requests.post");
const { QUOTE_REQUEST_LIMITS } = await import("../server/utils/quote-request-limits");

const request = () => ({
  firstName: "Alex", lastName: "Taylor", organisation: "", email: "alex@example.com",
  contactNumber: "+91 9876543210", address: "", notes: "", consent: true,
  items: [{ sku: "SKU-1", quantity: 2 }], submissionKey: "51b94582-fd62-47a9-9b47-99bdc7fc63b1",
});
const hash = (body: string) => createHash("sha256").update(body).digest("hex");
let clientNumber = 0;
function eventFor(body: string, client = `192.0.2.${++clientNumber}`, headers: Record<string, string> = {}) {
  return {
    node: {
      req: Object.assign(Readable.from([Buffer.from(body)]), { headers, socket: { remoteAddress: client } }),
      res: new EventEmitter(),
    },
    responseHeaders: {} as Record<string, string>,
  };
}
const send = (body: string) => handler(eventFor(body) as never);
const conflict = (error: unknown) => (error as { statusCode?: number }).statusCode === 409;
type Saved = { reference: string; submissionPayloadHash: string | null };

function mockDatabase(t: TestContext, saved: () => Saved | null = () => null) {
  const find = t.mock.method(prisma.quoteRequest, "findUnique", async () => saved() as never);
  const create = t.mock.method(prisma.quoteRequest, "create", async () => ({ reference: "IND-323" }) as never);
  const products = t.mock.method(prisma.product, "findMany", async () => [{ id: 1n, sku: "SKU-1", name: "Instrument" }] as never);
  return { find, create, products };
}

test("saves a hash of the exact request bytes alongside a new request", async (t) => {
  const { create } = mockDatabase(t);
  const body = JSON.stringify(request());
  assert.deepEqual(await send(body), { reference: "IND-323" });
  assert.equal(create.mock.calls.length, 1);
  const { data } = create.mock.calls[0]!.arguments[0]!;
  assert.equal(data.submissionPayloadHash, hash(body));
  assert.equal(data.submissionKey, request().submissionKey);
  assert.equal(data.items!.create![0].quantity, 2);
});

test("an identical retry returns its reference without looking up products or saving again", async (t) => {
  const body = JSON.stringify(request());
  const { create, products } = mockDatabase(t, () => ({ reference: "IND-323", submissionPayloadHash: hash(body) }));
  assert.deepEqual(await send(body), { reference: "IND-323" });
  assert.equal(create.mock.calls.length, 0);
  assert.equal(products.mock.calls.length, 0);
});

test("rejects changed details, items and even JSON whitespace on a reused key", async (t) => {
  const original = request();
  const { create } = mockDatabase(t, () => ({ reference: "IND-323", submissionPayloadHash: hash(JSON.stringify(original)) }));
  for (const body of [
    JSON.stringify({ ...original, firstName: "Other" }),
    JSON.stringify({ ...original, firstName: " Alex " }),
    JSON.stringify({ ...original, notes: "New requirements" }),
    JSON.stringify({ ...original, items: [{ sku: "SKU-1", quantity: 3 }] }),
    JSON.stringify(original, null, 2),
  ]) {
    await assert.rejects(send(body), conflict);
  }
  assert.equal(create.mock.calls.length, 0);
});

test("a simultaneous identical request reuses the saved reference", async (t) => {
  const body = JSON.stringify(request());
  let saved: Saved | null = null;
  const { create } = mockDatabase(t, () => saved);
  create.mock.mockImplementation(async () => {
    saved = { reference: "IND-323", submissionPayloadHash: hash(body) };
    throw { code: "P2002", meta: { target: ["captchaId"] } };
  });
  assert.deepEqual(await send(body), { reference: "IND-323" });
  assert.equal(create.mock.calls.length, 1);
});

test("a simultaneous different request on the same key is rejected", async (t) => {
  let saved: Saved | null = null;
  const { create } = mockDatabase(t, () => saved);
  create.mock.mockImplementation(async () => {
    saved = { reference: "IND-323", submissionPayloadHash: hash(JSON.stringify({ ...request(), notes: "Other request" })) };
    throw { code: "P2002", meta: { target: ["captchaId"] } };
  });
  await assert.rejects(send(JSON.stringify(request())), conflict);
  assert.equal(create.mock.calls.length, 1);
});

test("legacy keys without a payload hash cannot silently confirm a new payload", async (t) => {
  const { create } = mockDatabase(t, () => ({ reference: "IND-323", submissionPayloadHash: null }));
  await assert.rejects(send(JSON.stringify(request())), conflict);
  assert.equal(create.mock.calls.length, 0);
});

test("rejects malformed JSON before accessing the database", async (t) => {
  const { find, create } = mockDatabase(t);
  await assert.rejects(send("{"), (error: unknown) => (error as { statusCode?: number }).statusCode === 400);
  assert.equal(find.mock.calls.length, 0);
  assert.equal(create.mock.calls.length, 0);
});

test("rejects oversized bodies with and without Content-Length before database access", async (t) => {
  const { find, create, products } = mockDatabase(t);
  const tooLarge = (error: unknown) => (error as { statusCode?: number }).statusCode === 413;
  await assert.rejects(send("x".repeat(QUOTE_REQUEST_LIMITS.maxBodyBytes + 1)), tooLarge);
  const declaredOversize = eventFor("{}", undefined, { "content-length": String(QUOTE_REQUEST_LIMITS.maxBodyBytes + 1) });
  await assert.rejects(handler(declaredOversize as never), tooLarge);
  assert.equal(declaredOversize.node.req.readableFlowing, false);
  assert.equal(find.mock.calls.length, 0);
  assert.equal(create.mock.calls.length, 0);
  assert.equal(products.mock.calls.length, 0);
});

test("rate limits before reading bodies or touching the database and ignores spoofed forwarding headers", async (t) => {
  const { find, create, products } = mockDatabase(t);
  const client = "198.51.100.20";
  // Even malformed attempts count. Changing an untrusted header cannot bypass it.
  for (let attempt = 0; attempt < QUOTE_REQUEST_LIMITS.maxRequests; attempt++) {
    await assert.rejects(handler(eventFor("{", client, { "x-forwarded-for": `203.0.113.${attempt}` }) as never),
      (error: unknown) => (error as { statusCode?: number }).statusCode === 400);
  }
  const blocked = eventFor(JSON.stringify(request()), client, { "x-forwarded-for": "203.0.113.99" });
  await assert.rejects(handler(blocked as never), (error: unknown) => (error as { statusCode?: number }).statusCode === 429);
  assert.ok(Number(blocked.responseHeaders["retry-after"]) > 0);
  assert.equal(blocked.node.req.readableFlowing, false);
  assert.equal(blocked.responseHeaders.connection, "close");
  assert.equal(find.mock.calls.length, 0);
  assert.equal(create.mock.calls.length, 0);
  assert.equal(products.mock.calls.length, 0);
});
