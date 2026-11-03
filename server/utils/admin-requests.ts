import { createError } from "h3";

export const ADMIN_PAGE_SIZE = 25;

export function adminRequestQuery(query: Record<string, unknown>) {
  const { search = "", sort = "newest", page = "1" } = query;
  if (typeof search !== "string" || search.trim().length > 7 || !/^[a-z0-9-]*$/i.test(search.trim())
    || (sort !== "newest" && sort !== "oldest")
    || typeof page !== "string" || !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) {
    throw createError({ statusCode: 400, statusMessage: "Please use a valid Request ID, sort order and page." });
  }
  return { search: search.trim().toUpperCase(), sort, page: Number(page) };
}

export function adminRequestReference(value: string | undefined) {
  const reference = value?.trim().toUpperCase();
  if (!reference || !/^[A-Z]{3}-\d{3}$/.test(reference)) {
    throw createError({ statusCode: 404, statusMessage: "Request not found." });
  }
  return reference;
}
