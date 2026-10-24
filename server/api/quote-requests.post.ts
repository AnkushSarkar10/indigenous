import { prisma } from "../utils/db";
import { QUOTE_CONSENT_VERSION, validateQuoteRequest } from "../utils/quote-request";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const body: unknown = await readBody(event);
  let input;
  try {
    input = validateQuoteRequest(body);
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : "Please check your request." });
  }
  // Reuse the saved result if the browser retries after a network failure.
  const existing = await prisma.quoteRequest.findUnique({ where: { submissionKey: input.submissionKey }, select: { id: true } });
  if (existing) return { reference: existing.id };

  const products = await prisma.product.findMany({ where: { sku: { in: input.items.map((item) => item.sku) } }, select: { sku: true, name: true } });
  if (products.length !== input.items.length) throw createError({ statusCode: 400, statusMessage: "Some selected items are no longer in our catalogue. Please review your list." });
  const names = new Map(products.map((product) => [product.sku, product.name]));
  const { items, ...details } = input;
  const data = {
    ...details,
    items: items.map((item) => ({ ...item, name: names.get(item.sku)! })),
    consentVersion: QUOTE_CONSENT_VERSION,
  };
  const request = await prisma.quoteRequest.upsert({ where: { submissionKey: input.submissionKey }, create: data, update: {}, select: { id: true } });
  return { reference: request.id };
});
