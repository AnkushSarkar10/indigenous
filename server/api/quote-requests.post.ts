import { createHash } from "node:crypto";
import { prisma } from "../utils/db";
import { QUOTE_CONSENT_VERSION, validateQuoteRequest } from "../utils/quote-request";
import { QuoteReferenceUnavailableError, saveWithQuoteReference } from "../utils/quote-reference";
import { closeUnreadQuoteRequest, createQuoteRequestLimiter, readLimitedQuoteBody } from "../utils/quote-request-limits";
import { buildQuoteConfirmationEmail, quoteEmailSettings } from "../utils/quote-email";
import { deliverQuoteEmails } from "../utils/quote-email-delivery";

const allowQuoteRequest = createQuoteRequestLimiter();

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const config = useRuntimeConfig(event);
  const emailSettings = quoteEmailSettings(config);
  const trustProxy = String(config.quoteRequestTrustProxy) === "true";
  const client = getRequestIP(event, { xForwardedFor: trustProxy }) || "unknown";
  const limit = allowQuoteRequest(client);
  if (!limit.allowed) {
    closeUnreadQuoteRequest(event);
    setHeader(event, "Retry-After", limit.retryAfter);
    throw createError({ statusCode: 429, statusMessage: "Too many quote requests. Please wait a few minutes and try again." });
  }
  const rawBody = await readLimitedQuoteBody(event);
  let input;
  try {
    const body: unknown = JSON.parse(rawBody?.toString("utf8") ?? "");
    input = validateQuoteRequest(body);
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof SyntaxError ? "Please send a valid JSON request." : error instanceof Error ? error.message : "Please check your request." });
  }
  const submissionPayloadHash = createHash("sha256").update(rawBody!).digest("hex");
  // Reuse a saved result only for the exact request bytes, including when two
  // submissions race on the same key. Legacy keys without a hash are rejected.
  const findExisting = async () => {
    const saved = await prisma.quoteRequest.findUnique({ where: { submissionKey: input.submissionKey }, select: { reference: true, submissionPayloadHash: true } });
    if (!saved) return null;
    if (saved.submissionPayloadHash !== submissionPayloadHash) {
      throw createError({ statusCode: 409, statusMessage: "This submission key belongs to a different request. Please submit again." });
    }
    return { reference: saved.reference };
  };
  const existing = await findExisting();
  if (existing) return existing;

  const products = await prisma.product.findMany({ where: { sku: { in: input.items.map((item) => item.sku) } }, select: { id: true, sku: true, name: true } });
  if (products.length !== input.items.length) throw createError({ statusCode: 400, statusMessage: "Some selected items are no longer in our catalogue. Please review your list." });
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const { items, ...details } = input;
  const data = {
    ...details,
    submissionPayloadHash,
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
    const saved = await saveWithQuoteReference(
      (reference) => prisma.quoteRequest.create({ data: {
        ...data, reference,
        // Nested creation commits the quote and its notification together.
        ...(emailSettings ? { confirmationEmail: { create: { payload: buildQuoteConfirmationEmail({ reference, firstName: input.firstName, email: input.email, items: data.items.create }, emailSettings) } } } : {}),
      }, select: { reference: true } }),
      findExisting,
    );
    if (emailSettings) {
      const delivery = deliverQuoteEmails(process.env.RESEND_API_KEY, saved.reference).catch(() => {
        console.warn("Quote email worker unavailable; pending confirmation will be retried.");
      });
      event.waitUntil(delivery);
    }
    return saved;
  } catch (error) {
    if (error instanceof QuoteReferenceUnavailableError) {
      throw createError({ statusCode: 503, statusMessage: "We couldn’t create your reference. Please try submitting your request again." });
    }
    throw error;
  }
});
