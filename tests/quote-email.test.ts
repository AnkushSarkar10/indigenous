import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuoteConfirmationEmail, confirmationPhoneHtml, quoteEmailSettings } from "../server/utils/quote-email";
import { HOMEPAGE_CONTENT } from "../app/constants/homepage";

const settings = { fromEmail: "Indigenous <onboarding@resend.dev>", templateId: "test-template" };
const quote = () => ({ reference: "IND-323", firstName: "Alex", email: "delivered@resend.dev", items: [{ nameSnapshot: "Instrument", skuSnapshot: "SKU-1", quantity: 2 }] });

test("confirmation includes the saved reference and requested quantities and escapes HTML", () => {
  const payload = buildQuoteConfirmationEmail({ ...quote(), firstName: "<Alex>", items: [{ nameSnapshot: '<a href="https://example.com">Instrument</a>', skuSnapshot: "SKU&1", quantity: 2 }] }, settings);
  assert.deepEqual(payload.to, ["delivered@resend.dev"]);
  assert.equal(payload.subject, "Quote request received — IND-323");
  assert.equal(payload.template.variables.CUSTOMER_NAME, "&lt;Alex&gt;");
  assert.match(payload.template.variables.ITEMS_HTML, /SKU&amp;1/);
  assert.match(payload.template.variables.ITEMS_HTML, /Quantity: 2/);
  assert.doesNotMatch(payload.template.variables.ITEMS_HTML, /<a /);
  assert.equal(payload.attachments, undefined);
  assert.equal(payload.template.variables.CONFIRMATION_PHONE_HTML, confirmationPhoneHtml(HOMEPAGE_CONTENT.phone));
});

test("real confirmation numbers become call links while placeholders remain plain text", () => {
  assert.equal(confirmationPhoneHtml("+91 XXXXX XXXXX"), "+91 XXXXX XXXXX");
  assert.match(confirmationPhoneHtml("+91 98765 43210"), /href="tel:\+919876543210"/);
  assert.equal(confirmationPhoneHtml('<phone>'), "&lt;phone&gt;");
});

test("200 requested items preserve every full snapshot in an attachment without overflowing template variables", () => {
  const input = { ...quote(), items: Array.from({ length: 200 }, (_, i) => ({ nameSnapshot: `Item ${i} ${"Very long product name ".repeat(20)}`, skuSnapshot: `SKU-${i}`, quantity: i + 1 })) };
  const payload = buildQuoteConfirmationEmail(input, settings);
  for (const value of Object.values(payload.template.variables)) assert.ok(value.length <= 2000);
  const attachment = Buffer.from(payload.attachments![0].content, "base64").toString("utf8");
  for (const item of input.items) assert.ok(attachment.includes(`${item.nameSnapshot}\nSKU: ${item.skuSnapshot}\nQuantity: ${item.quantity}`));
  assert.match(payload.template.variables.ITEMS_NOTE, /complete requested item list is attached/);
});

test("an individual item larger than the preview still appears in full in the attachment", () => {
  const payload = buildQuoteConfirmationEmail({ ...quote(), items: [{ nameSnapshot: "é".repeat(3000), skuSnapshot: "SKU-LARGE", quantity: 9 }] }, settings);
  assert.match(payload.template.variables.ITEMS_HTML, /attached/);
  assert.ok(Buffer.from(payload.attachments![0].content, "base64").toString("utf8").includes("é".repeat(3000)));
});

test("email queueing requires explicit enablement and template settings", () => {
  assert.equal(quoteEmailSettings({}), null);
  assert.equal(quoteEmailSettings({ quoteEmailEnabled: "false" }), null);
  assert.deepEqual(quoteEmailSettings({ quoteEmailEnabled: "true", resendFromEmail: settings.fromEmail, resendQuoteTemplateId: settings.templateId }), settings);
});
