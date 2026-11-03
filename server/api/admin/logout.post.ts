import { defineEventHandler, deleteCookie } from "h3";
import { ADMIN_COOKIE_NAME, requireAdminOrigin } from "../../utils/admin-auth";

export default defineEventHandler((event) => {
  requireAdminOrigin(event);
  deleteCookie(event, ADMIN_COOKIE_NAME, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  return { success: true };
});
