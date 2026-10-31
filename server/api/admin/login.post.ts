import { createError, defineEventHandler, getHeader } from "h3";
import { adminSession, adminSettings, ADMIN_SESSION_SECONDS, requireAdminOrigin } from "../../utils/admin-auth";
import { verifyAdminPassword } from "../../utils/admin-password";
import { readLimitedQuoteBody } from "../../utils/quote-request-limits";

export default defineEventHandler(async (event) => {
  requireAdminOrigin(event);
  const settings = adminSettings(event);
  if (getHeader(event, "content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    throw createError({ statusCode: 415, statusMessage: "Please send a JSON sign-in request." });
  }
  const bytes = await readLimitedQuoteBody(event, { maxBodyBytes: 8192, bodyTimeoutMs: 10_000 });
  let body: unknown;
  try { body = JSON.parse(bytes.toString("utf8")); }
  catch { throw createError({ statusCode: 400, statusMessage: "Please enter your email and password." }); }
  if (!body || typeof body !== "object" || !("email" in body) || !("password" in body)
    || typeof body.email !== "string" || typeof body.password !== "string"
    || body.email.length > 254 || !body.password || Buffer.byteLength(body.password) > 1024) {
    throw createError({ statusCode: 400, statusMessage: "Please enter your email and password." });
  }
  // Verify the password even for an incorrect email. Login attempts are unlimited.
  const validPassword = await verifyAdminPassword(body.password, settings.passwordHash);
  if (!validPassword || body.email.trim().toLowerCase() !== settings.email) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect email or password." });
  }
  // Discard any previous session before issuing a new one.
  const previous = await adminSession(event, settings);
  await previous.clear();
  const session = await adminSession(event, settings);
  await session.update({ email: settings.email, expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000 });
  return { email: settings.email };
});
