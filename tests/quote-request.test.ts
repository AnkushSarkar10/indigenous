import assert from "node:assert/strict";
import { test } from "node:test";
import { validateQuoteRequest } from "../server/utils/quote-request";

const request = () => ({
  firstName: "  Alex  ", lastName: "Taylor", organisation: "Example Clinic",
  email: "alex@example.com", contactNumber: "+91 98765 43210", address: "123 Example Street, Bengaluru, India",
  notes: "", consent: true, items: [{ sku: "EXAMPLE-1", quantity: 2 }],
});

test("normalises details and keeps only trusted item fields", () => {
  const body = { ...request(), items: [{ sku: "EXAMPLE-1", quantity: 2, name: "Untrusted name" }] };
  const result = validateQuoteRequest(body);
  assert.equal(result.firstName, "Alex");
  assert.equal(result.notes, "");
  assert.deepEqual(result.items, [{ sku: "EXAMPLE-1", quantity: 2 }]);
});

test("requires first name, last name, email, contact number and explicit consent", () => {
  for (const key of ["firstName", "lastName", "email", "contactNumber"]) {
    assert.throws(() => validateQuoteRequest({ ...request(), [key]: " " }));
    assert.throws(() => validateQuoteRequest({ ...request(), [key]: undefined }));
  }
  for (const consent of [false, "true", undefined]) assert.throws(() => validateQuoteRequest({ ...request(), consent }));
  assert.throws(() => validateQuoteRequest({ ...request(), email: "invalid@" }));
  assert.throws(() => validateQuoteRequest({ ...request(), contactNumber: "123" }));
  assert.throws(() => validateQuoteRequest({ ...request(), notes: "a".repeat(3001) }));
});

test("allows optional contact details and notes to be omitted or blank", () => {
  for (const value of [undefined, "", " "]) {
    const result = validateQuoteRequest({ ...request(), organisation: value, address: value, notes: value });
    assert.equal(result.organisation, "");
    assert.equal(result.address, "");
    assert.equal(result.notes, "");
  }
  assert.throws(() => validateQuoteRequest({ ...request(), contactNumber: "not a phone number" }));
});

test("rejects empty lists, duplicate SKUs and invalid quantities", () => {
  assert.throws(() => validateQuoteRequest({ ...request(), items: [] }));
  assert.throws(() => validateQuoteRequest({ ...request(), items: Array(201).fill({ sku: "A", quantity: 1 }) }));
  assert.throws(() => validateQuoteRequest({ ...request(), items: [{ sku: "A", quantity: 1 }, { sku: "A", quantity: 2 }] }));
  for (const quantity of [0, -1, 1.5, 10000, "2", NaN]) {
    assert.throws(() => validateQuoteRequest({ ...request(), items: [{ sku: "A", quantity }] }));
  }
});

test("accepts requests without verification and preserves a retry key", () => {
  const result = validateQuoteRequest(request());
  assert.match(result.submissionKey, /^[\da-f-]{36}$/i);
  const submissionKey = "51b94582-fd62-47a9-9b47-99bdc7fc63b1";
  assert.equal(validateQuoteRequest({ ...request(), submissionKey }).submissionKey, submissionKey);
  assert.throws(() => validateQuoteRequest({ ...request(), submissionKey: "invalid" }));
});
