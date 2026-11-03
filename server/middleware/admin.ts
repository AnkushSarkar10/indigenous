import { defineEventHandler, getRequestURL, setHeader } from "h3";
import { requireAdmin } from "../utils/admin-auth";

const publicAuthPaths = new Set(["/api/admin/login", "/api/admin/logout"]);

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname.replace(/\/+$/, "");
  const adminApi = path === "/api/admin" || path.startsWith("/api/admin/");
  if (!adminApi && path !== "/admin" && !path.startsWith("/admin/")) return;

  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  setHeader(event, "Referrer-Policy", "same-origin");
  setHeader(event, "X-Frame-Options", "DENY");

  if (adminApi && !publicAuthPaths.has(path)) {
    event.context.admin = await requireAdmin(event);
  }
});
