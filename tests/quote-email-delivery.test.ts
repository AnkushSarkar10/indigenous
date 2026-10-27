import assert from "node:assert/strict";
import { test } from "node:test";
import type { Resend } from "resend";

Object.assign(globalThis, { prisma: { quoteConfirmationEmail: {
  findMany: async () => [], updateMany: async () => ({ count: 0 }), update: async () => ({}),
} } });
const { prisma } = await import("../server/utils/db");
const { deliverQuoteEmails } = await import("../server/utils/quote-email-delivery");
const clock = () => new Date("2026-10-26T14:00:00Z");
const pendingJob = () => ({ quoteRequestId: "quote-1", payload: { from: "onboarding@resend.dev", to: ["delivered@resend.dev"], subject: "Quote IND-323", template: { id: "template-1", variables: { REFERENCE: "IND-323" } } }, status: "pending", attempts: 0, firstAttemptAt: null, nextAttemptAt: clock(), providerMessageId: null, sentAt: null, lastError: null });
type Send = Resend["emails"]["send"];

test("a successful send uses a stable key and records the provider message ID", async (t) => {
  t.mock.method(prisma.quoteConfirmationEmail, "findMany", async () => [pendingJob()] as never);
  t.mock.method(prisma.quoteConfirmationEmail, "updateMany", async () => ({ count: 1 }));
  const updates = t.mock.method(prisma.quoteConfirmationEmail, "update", async () => ({}) as never);
  const send: Send = async (payload, options) => {
    assert.deepEqual(payload, pendingJob().payload);
    assert.equal(options?.idempotencyKey, "quote-confirmation/quote-1");
    assert.ok(options?.signal);
    return { data: { id: "email-1" }, error: null, headers: null };
  };
  assert.deepEqual(await deliverQuoteEmails("test-key", undefined, send, clock), { sent: 1, failed: 0 });
  assert.equal(updates.mock.calls[0]!.arguments[0].data.providerMessageId, "email-1");
  assert.equal(updates.mock.calls[0]!.arguments[0].data.status, "sent");
});

test("another worker winning the claim prevents a second send", async (t) => {
  t.mock.method(prisma.quoteConfirmationEmail, "findMany", async () => [pendingJob()] as never);
  t.mock.method(prisma.quoteConfirmationEmail, "updateMany", async () => ({ count: 0 }));
  const send: Send = async () => { throw new Error("Must not send"); };
  assert.deepEqual(await deliverQuoteEmails("test-key", undefined, send, clock), { sent: 0, failed: 0 });
});

test("rate limits respect Retry-After and permanent provider errors stop retries", async (t) => {
  t.mock.method(prisma.quoteConfirmationEmail, "findMany", async () => [pendingJob()] as never);
  t.mock.method(prisma.quoteConfirmationEmail, "updateMany", async () => ({ count: 1 }));
  const updates = t.mock.method(prisma.quoteConfirmationEmail, "update", async () => ({}) as never);
  const limited: Send = async () => ({ data: null, error: { name: "rate_limit_exceeded", message: "limit", statusCode: 429 }, headers: { "retry-after": "600" } });
  await deliverQuoteEmails("test-key", undefined, limited, clock);
  const retry = updates.mock.calls[0]!.arguments[0].data;
  assert.equal(retry.status, "pending");
  assert.equal((retry.nextAttemptAt as Date).getTime(), clock().getTime() + 600_000);
  const forbidden: Send = async () => ({ data: null, error: { name: "validation_error", message: "Private address must not be logged", statusCode: 403 }, headers: null });
  await deliverQuoteEmails("test-key", undefined, forbidden, clock);
  const failure = updates.mock.calls[1]!.arguments[0].data;
  assert.equal(failure.status, "failed");
  assert.equal(failure.lastError, "validation_error (403)");
});

test("network failures remain queued and expired idempotency windows require review", async (t) => {
  t.mock.method(prisma.quoteConfirmationEmail, "findMany", async () => [pendingJob()] as never);
  const claims = t.mock.method(prisma.quoteConfirmationEmail, "updateMany", async () => ({ count: 1 }));
  const updates = t.mock.method(prisma.quoteConfirmationEmail, "update", async () => ({}) as never);
  const send: Send = async () => { throw new Error("Disconnected"); };
  assert.deepEqual(await deliverQuoteEmails("test-key", undefined, send, clock), { sent: 0, failed: 1 });
  assert.equal(updates.mock.calls[0]!.arguments[0].data.status, "pending");
  const expiration = claims.mock.calls[0]!.arguments[0];
  assert.equal(expiration.data.status, "review");
  assert.equal((expiration.where.firstAttemptAt as { lte: Date }).lte.getTime(), clock().getTime() - 23 * 60 * 60_000);
});
