import type { CreateEmailOptions } from "resend";
import { HOMEPAGE_CONTENT } from "../../app/constants/homepage";

type QuoteEmailInput = {
  reference: string;
  firstName: string;
  email: string;
  items: { nameSnapshot: string; skuSnapshot: string; quantity: number }[];
};

export type QuoteEmailSettings = { fromEmail: string; templateId: string };

export function quoteEmailSettings(config: { quoteEmailEnabled?: unknown; resendFromEmail?: string; resendQuoteTemplateId?: string }): QuoteEmailSettings | null {
  if (String(config.quoteEmailEnabled) !== "true") return null;
  if (!config.resendFromEmail || !config.resendQuoteTemplateId) {
    console.warn("Quote emails enabled but sender or template configuration is missing.");
    return null;
  }
  return { fromEmail: config.resendFromEmail, templateId: config.resendQuoteTemplateId };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function confirmationPhoneHtml(phone = HOMEPAGE_CONTENT.phone) {
  const display = escapeHtml(phone);
  return /^\+?[\d\s().-]+$/.test(phone)
    ? `<a href="tel:${phone.replace(/[^\d+]/g, "")}" style="color:#0084d1;text-decoration:none;">${display}</a>`
    : display;
}

export function buildQuoteConfirmationEmail(quote: QuoteEmailInput, settings: QuoteEmailSettings) {
  // Resend template strings have a 2,000-character limit. Keep complete rows
  // in the preview and attach the full list when it does not fit in the body.
  let preview = "";
  let displayed = 0;
  for (const item of quote.items) {
    const row = `<li>${escapeHtml(item.nameSnapshot)} (${escapeHtml(item.skuSnapshot)}) — Quantity: ${item.quantity}</li>`;
    if (preview.length + row.length > 2000) break;
    preview += row;
    displayed++;
  }
  const overflow = displayed < quote.items.length;
  const fullList = [
    `Quote request: ${quote.reference}`,
    "",
    ...quote.items.map((item, index) => `${index + 1}. ${item.nameSnapshot}\nSKU: ${item.skuSnapshot}\nQuantity: ${item.quantity}\n`),
  ].join("\n");
  return {
    from: settings.fromEmail,
    to: [quote.email],
    subject: `Quote request received — ${quote.reference}`,
    template: {
      id: settings.templateId,
      variables: {
        CUSTOMER_NAME: escapeHtml(quote.firstName),
        REFERENCE: quote.reference,
        ITEMS_HTML: preview || "<li>Please see the attached item list.</li>",
        ITEMS_NOTE: overflow ? `Showing ${displayed} of ${quote.items.length} items above. The complete requested item list is attached.` : "All requested items are listed above.",
        CONFIRMATION_PHONE_HTML: confirmationPhoneHtml(),
      },
    },
    ...(overflow ? { attachments: [{ filename: `quote-${quote.reference}-items.txt`, content: Buffer.from(fullList, "utf8").toString("base64"), contentType: "text/plain; charset=utf-8" }] } : {}),
  } satisfies CreateEmailOptions;
}
