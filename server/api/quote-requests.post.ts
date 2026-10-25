import { prisma } from "../utils/db";
import { QUOTE_CONSENT_VERSION, validateQuoteRequest } from "../utils/quote-request";
import { QuoteReferenceUnavailableError, saveWithQuoteReference } from "../utils/quote-reference";

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
  const findExisting = () => prisma.quoteRequest.findUnique({ where: { submissionKey: input.submissionKey }, select: { reference: true } });
  const existing = await findExisting();
  if (existing) return existing;

  const products = await prisma.product.findMany({ where: { sku: { in: input.items.map((item) => item.sku) } }, select: { id: true, sku: true, name: true } });
  if (products.length !== input.items.length) throw createError({ statusCode: 400, statusMessage: "Some selected items are no longer in our catalogue. Please review your list." });
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const { items, ...details } = input;
  const data = {
    ...details,
    items: {
      create: items.map((item) => {
        const product = productsBySku.get(item.sku)!;
        return {
          product: { connect: { id: product.id } },
          quantity: item.quantity,
          skuSnapshot: product.sku,
          nameSnapshot: product.name,
        };
      }),
    },
    consentVersion: QUOTE_CONSENT_VERSION,
  };
  try {
    return await saveWithQuoteReference(
      (reference) => prisma.quoteRequest.upsert({ where: { submissionKey: input.submissionKey }, create: { ...data, reference }, update: {}, select: { reference: true } }),
      findExisting,
    );
  } catch (error) {
    if (error instanceof QuoteReferenceUnavailableError) {
      throw createError({ statusCode: 503, statusMessage: "We couldn’t create your reference. Please try submitting your request again." });
    }
    throw error;
  }
});
