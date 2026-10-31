import { createHash } from "node:crypto";
import { createError, getCookie, getHeader, getRequestURL, useSession, type H3Event } from "h3";
import { isAdminPasswordHash } from "./admin-password";

export const ADMIN_COOKIE_NAME = "indigenous-admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

export function adminSettings(event: H3Event) {
  const config = useRuntimeConfig(event);
  const email = String(config.adminEmail || "").trim().toLowerCase();
  const passwordHash = String(config.adminPasswordHash || "");
  const secret = String(config.adminSessionSecret || "");
  if (!email || !isAdminPasswordHash(passwordHash) || secret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: "Admin login is not configured. Run pnpm admin:setup on the server." });
  }
  // Rotating any credential also invalidates all previously issued cookies.
  const password = createHash("sha256").update(JSON.stringify([email, passwordHash, secret])).digest("hex");
  return { email, passwordHash, password };
}

export function adminSession(event: H3Event, settings = adminSettings(event)) {
  return useSession<{ email: string; expiresAt: number }>(event, {
    name: ADMIN_COOKIE_NAME,
    password: settings.password,
    maxAge: ADMIN_SESSION_SECONDS,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" },
  });
}

export async function requireAdmin(event: H3Event) {
  if (!getCookie(event, ADMIN_COOKIE_NAME)) {
    throw createError({ statusCode: 401, statusMessage: "Please sign in to continue." });
  }
  const settings = adminSettings(event);
  const session = await adminSession(event, settings);
  if (session.data.email !== settings.email || !Number.isFinite(session.data.expiresAt) || session.data.expiresAt <= Date.now()) {
    await session.clear();
    throw createError({ statusCode: 401, statusMessage: "Your session has expired. Please sign in again." });
  }
  return { email: settings.email };
}

export function requireAdminOrigin(event: H3Event) {
  // POST endpoints accept only same-origin browser requests, including login.
  if (getHeader(event, "origin") !== getRequestURL(event).origin || getHeader(event, "sec-fetch-site") === "cross-site") {
    throw createError({ statusCode: 403, statusMessage: "This sign-in request is not allowed." });
  }
}
