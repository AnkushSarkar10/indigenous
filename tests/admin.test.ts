import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { before, test } from "node:test";
import { createError, createEvent, createRouter, sealSession, setHeader } from "h3";
import { hashAdminPassword, isAdminPasswordHash, verifyAdminPassword } from "../server/utils/admin-password";
import { adminRequestQuery } from "../server/utils/admin-requests";

const password = "A local test password 123!";
const passwordHash = await hashAdminPassword(password);
const settings = { adminEmail: "team@example.com", adminPasswordHash: passwordHash, adminSessionSecret: "a-test-secret-with-at-least-32-characters" };
Object.assign(globalThis, {
  useRuntimeConfig: () => settings,
  // The bounded body reader also serves the existing public quote endpoint.
  createError, setHeader,
  prisma: {
    quoteRequest: {
      count: async () => { throw new Error("Unexpected database count"); },
      findMany: async () => { throw new Error("Unexpected database list"); },
      findUnique: async () => { throw new Error("Unexpected database lookup"); },
    },
  },
});
const { prisma } = await import("../server/utils/db");
const { ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS, adminSettings } = await import("../server/utils/admin-auth");
const { default: middleware } = await import("../server/middleware/admin");
const { default: loginHandler } = await import("../server/api/admin/login.post");
const { default: logoutHandler } = await import("../server/api/admin/logout.post");
const { default: sessionHandler } = await import("../server/api/admin/session.get");
const { default: listHandler } = await import("../server/api/admin/requests/index.get");
const { default: detailHandler } = await import("../server/api/admin/requests/[reference].get");

const router = createRouter()
  .post("/api/admin/login", loginHandler)
  .post("/api/admin/logout", logoutHandler)
  .get("/api/admin/session", sessionHandler)
  .get("/api/admin/requests", listHandler)
  .get("/api/admin/requests/:reference", detailHandler);
const origin = "http://admin.test";
let cookie: string;
before(async () => {
  const response = await signIn();
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")!.split(";")[0]!;
});

// Exercise real H3 events, routing and cookies without binding a network socket.
async function fetch(input: string, init: RequestInit = {}) {
  const url = new URL(input);
  const headers = new Headers(init.headers);
  headers.set("host", url.host);
  const req = Object.assign(Readable.from([Buffer.from(String(init.body || ""))]), {
    headers: Object.fromEntries(headers), method: init.method || "GET", url: url.pathname + url.search,
    socket: {}, connection: {},
  });
  const res = new ServerResponse(req as never);
  const event = createEvent(req as never, res);
  let body: unknown;
  try { await middleware(event); body = await router.handler(event); }
  catch (error) {
    const failure = error as { statusCode?: number; statusMessage?: string };
    res.statusCode = failure.statusCode || 500;
    body = { statusMessage: failure.statusMessage };
  }
  const responseHeaders = new Headers();
  for (const [name, value] of Object.entries(res.getHeaders())) {
    for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) responseHeaders.append(name, String(item));
  }
  res.emit("finish");
  return new Response(JSON.stringify(body), { status: res.statusCode, headers: responseHeaders });
}

function signIn(body: unknown = { email: settings.adminEmail, password }, headers: Record<string, string> = {}) {
  return fetch(`${origin}/api/admin/login`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function read(path: string, authenticated = true) {
  return fetch(`${origin}${path}`, { headers: authenticated ? { cookie } : {} });
}

test("passwords are salted and verified without trimming, and malformed hashes fail safely", async () => {
  assert.ok(isAdminPasswordHash(passwordHash));
  assert.ok(await verifyAdminPassword(password, passwordHash));
  assert.equal(await verifyAdminPassword(` ${password}`, passwordHash), false);
  assert.equal(await verifyAdminPassword(password, "scrypt:999999999:8:3:bad:hash"), false);
  assert.equal(await verifyAdminPassword("x".repeat(1025), passwordHash), false);
  assert.notEqual(await hashAdminPassword(password), passwordHash);
});

test("login normalizes email and issues an HTTP-only, same-site cookie with an eight-hour expiry", async () => {
  const response = await signIn({ email: " TEAM@EXAMPLE.COM ", password });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: settings.adminEmail });
  const header = response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Strict/i);
  assert.match(header, /Path=\//);
  const expiry = new Date(/Expires=([^;]+)/i.exec(header)![1]!).getTime();
  assert.ok(Math.abs(expiry - Date.now() - ADMIN_SESSION_SECONDS * 1000) < 2000);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await read("/api/admin/session")).status, 200);
});

test("login attempts stay unlimited and incorrect emails receive the same error", async () => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await signIn({ email: settings.adminEmail, password: "incorrect password" });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("retry-after"), null);
    assert.equal((await response.json()).statusMessage, "Incorrect email or password.");
  }
  const wrongEmail = await signIn({ email: "other@example.com", password });
  assert.equal(wrongEmail.status, 401);
  assert.equal((await wrongEmail.json()).statusMessage, "Incorrect email or password.");
  assert.equal((await signIn()).status, 200);
});

test("cross-origin login and logout and form submissions are rejected", async () => {
  assert.equal((await signIn(undefined, { origin: "https://other.example" })).status, 403);
  assert.equal((await signIn(undefined, { origin: "null" })).status, 403);
  assert.equal((await signIn(undefined, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await signIn(undefined, { "content-type": "application/x-www-form-urlencoded" })).status, 415);
  assert.equal((await fetch(`${origin}/api/admin/logout`, { method: "POST", headers: { cookie, origin: "https://other.example" } })).status, 403);
});

test("invalid and oversized login bodies are rejected without issuing an authenticated cookie", async () => {
  for (const body of [null, [], {}, { email: [], password }, { email: settings.adminEmail, password: "" }]) {
    assert.equal((await signIn(body)).status, 400);
  }
  const oversized = await signIn({ email: settings.adminEmail, password: "x".repeat(9000) });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.headers.get("set-cookie"), null);
});

test("missing credentials fail closed without a default login", async (t) => {
  t.mock.method(globalThis as typeof globalThis & { useRuntimeConfig: () => unknown }, "useRuntimeConfig", () => ({}));
  const response = await signIn();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("all admin reads reject missing and forged sessions before accessing the database", async () => {
  for (const path of ["/api/admin/session", "/api/admin/requests", "/api/admin/requests/IND-323", "/api/admin/requests/?search=IND-323"]) {
    const response = await read(path, false);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const forged = await fetch(`${origin}${path}`, { headers: { cookie: `${ADMIN_COOKIE_NAME}=forged` } });
    assert.equal(forged.status, 401);
  }
  const headerSession = await fetch(`${origin}/api/admin/session`, { headers: { [`x-${ADMIN_COOKIE_NAME}-session`]: cookie.split("=")[1]! } });
  assert.equal(headerSession.status, 401);
});

test("expired sessions and sessions issued before credential rotation cannot access requests", async (t) => {
  const event = { context: { sessions: { [ADMIN_COOKIE_NAME]: { id: randomUUID(), createdAt: Date.now(), data: { email: settings.adminEmail, expiresAt: Date.now() - 1000 } } } } };
  const token = await sealSession(event as never, { name: ADMIN_COOKIE_NAME, password: adminSettings({} as never).password, maxAge: ADMIN_SESSION_SECONDS });
  assert.equal((await fetch(`${origin}/api/admin/requests`, { headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` } })).status, 401);
  t.mock.method(globalThis as typeof globalThis & { useRuntimeConfig: () => unknown }, "useRuntimeConfig", () => ({ ...settings, adminSessionSecret: `${settings.adminSessionSecret}-rotated` }));
  assert.equal((await read("/api/admin/requests")).status, 401);
});

test("logout clears the cookie and subsequent requests require a new login", async () => {
  const response = await fetch(`${origin}/api/admin/logout`, { method: "POST", headers: { origin, cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie")!, /Max-Age=0/i);
  assert.equal((await read("/api/admin/requests", false)).status, 401);
});

test("newest-first pagination queries the database with a stable date and ID order", async (t) => {
  const count = t.mock.method(prisma.quoteRequest, "count", async () => 60);
  const list = t.mock.method(prisma.quoteRequest, "findMany", async () => [{ reference: "IND-323", createdAt: new Date("2026-10-28T10:00:00Z"), firstName: "Alex", lastName: "Taylor", organisation: null, _count: { items: 2 } }] as never);
  const response = await read("/api/admin/requests?page=2");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.page, 2);
  assert.equal(body.pages, 3);
  assert.equal(body.total, 60);
  assert.equal(body.requests[0].createdAt, "2026-10-28T10:00:00.000Z");
  assert.equal(body.requests[0].itemCount, 2);
  assert.deepEqual(count.mock.calls[0]!.arguments[0], { where: {} });
  const args = list.mock.calls[0]!.arguments[0]!;
  assert.deepEqual(args.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(args.skip, 25);
  assert.equal(args.take, 25);
  assert.equal("email" in args.select!, false);
  assert.equal("submissionKey" in args.select!, false);
});

test("ID search is normalized, applied to the full database and retained with oldest-first sorting", async (t) => {
  const count = t.mock.method(prisma.quoteRequest, "count", async () => 1);
  const list = t.mock.method(prisma.quoteRequest, "findMany", async () => [] as never);
  const response = await read("/api/admin/requests?search=%20ind-323%20&sort=oldest&page=999");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).page, 1);
  assert.deepEqual(count.mock.calls[0]!.arguments[0], { where: { reference: { contains: "IND-323" } } });
  const args = list.mock.calls[0]!.arguments[0]!;
  assert.deepEqual(args.where, { reference: { contains: "IND-323" } });
  assert.deepEqual(args.orderBy, [{ createdAt: "asc" }, { id: "asc" }]);
  assert.equal(args.skip, 0);
});

test("empty results use a valid first page and malformed query values are rejected", async (t) => {
  t.mock.method(prisma.quoteRequest, "count", async () => 0);
  t.mock.method(prisma.quoteRequest, "findMany", async () => [] as never);
  const response = await read("/api/admin/requests?search=ZZZ-000&page=2");
  assert.deepEqual(await response.json(), { requests: [], total: 0, page: 1, pages: 1, pageSize: 25 });
  for (const query of ["page=0", "page=-1", "page=1.1", "page=999999999999999999999", "sort=invalid", "search=TOO-LONG", "search=a&search=b"]) {
    assert.equal((await read(`/api/admin/requests?${query}`)).status, 400);
  }
  assert.equal(adminRequestQuery({ search: "ind" }).search, "IND");
});

test("request details use the public reference and saved product snapshots", async (t) => {
  const saved = { reference: "IND-323", createdAt: new Date("2026-10-28T10:00:00Z"), firstName: "Alex", lastName: "Taylor", organisation: null, email: "alex@example.com", contactNumber: "1234567890", address: "Saved address", notes: "Saved notes", items: [{ skuSnapshot: "SKU-1", nameSnapshot: "Original product name", quantity: 3 }] };
  const find = t.mock.method(prisma.quoteRequest, "findUnique", async () => saved as never);
  const response = await read("/api/admin/requests/ind-323");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items[0].nameSnapshot, "Original product name");
  assert.equal(body.items[0].quantity, 3);
  const args = find.mock.calls[0]!.arguments[0]!;
  assert.deepEqual(args.where, { reference: "IND-323" });
  assert.equal("product" in (args.select!.items as { select: object }).select, false);
  assert.equal("submissionPayloadHash" in args.select!, false);
});

test("missing and invalid request references return 404", async (t) => {
  const find = t.mock.method(prisma.quoteRequest, "findUnique", async () => null);
  assert.equal((await read("/api/admin/requests/ZZZ-000")).status, 404);
  assert.equal((await read("/api/admin/requests/not-a-reference")).status, 404);
  assert.equal(find.mock.calls.length, 1);
});
