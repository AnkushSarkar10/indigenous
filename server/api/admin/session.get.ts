import { defineEventHandler } from "h3";

export default defineEventHandler((event) => ({ email: event.context.admin.email as string }));
