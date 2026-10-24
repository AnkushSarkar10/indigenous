import { randomUUID } from "node:crypto";

export const QUOTE_CONSENT_VERSION = "2026-10-24";

export function validateQuoteRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Please complete your contact details.");
  const input = value as Record<string, unknown>;
  function field(name: string, label: string, max: number, optional = false) {
    const raw = input[name];
    if (optional && raw == null) return "";
    if (typeof raw !== "string") throw new Error(`Please enter ${label}.`);
    const text = raw.trim();
    if ((!optional && !text) || text.length > max) throw new Error(`Please enter ${label} (up to ${max} characters).`);
    return text;
  }
  const details = {
    firstName: field("firstName", "your first name", 100),
    lastName: field("lastName", "your last name", 100),
    organisation: field("organisation", "your organisation", 200, true),
    email: field("email", "your email address", 254),
    contactNumber: field("contactNumber", "your contact number", 40),
    address: field("address", "your address", 1000, true),
    notes: field("notes", "your notes", 3000, true),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) throw new Error("Please enter a valid email address.");
  if (!/^[+\d\s().-]+$/.test(details.contactNumber) || details.contactNumber.replace(/\D/g, "").length < 7) {
    throw new Error("Please enter a valid contact number with at least 7 digits.");
  }
  if (input.consent !== true) throw new Error("Please agree to the collection and use of your details for this quote request.");
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 200) throw new Error("Please select between 1 and 200 products for your quote.");
  const seen = new Set<string>();
  const items = input.items.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Your quote list contains an invalid item.");
    const item = value as Record<string, unknown>;
    if (typeof item.sku !== "string" || !item.sku.trim() || item.sku.length > 200 || seen.has(item.sku)
      || typeof item.quantity !== "number" || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
      throw new Error("Please check your selected items and use quantities between 1 and 9,999.");
    }
    seen.add(item.sku);
    return { sku: item.sku, quantity: item.quantity };
  });
  const submissionKey = input.submissionKey ?? randomUUID();
  if (typeof submissionKey !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(submissionKey)) {
    throw new Error("Please refresh the page and try submitting your request again.");
  }
  return { ...details, items, submissionKey };
}
