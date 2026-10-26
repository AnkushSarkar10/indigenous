import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareQuoteSubmission } from "../app/utils/quote-submission";

const payload = () => ({
  firstName: "Alex", lastName: "Taylor", organisation: "Clinic",
  email: "alex@example.com", contactNumber: "+91 9876543210",
  address: "Example Street", notes: "", consent: true,
  items: [{ sku: "SKU-1", quantity: 2 }, { sku: "SKU-2", quantity: 1 }],
});

test("an identical retry preserves the UUID and exact request body", () => {
  const original = prepareQuoteSubmission(payload(), null, () => "first-key");
  const retry = prepareQuoteSubmission(payload(), original, () => { throw new Error("Must not mint a retry key"); });
  assert.equal(retry, original);
  assert.equal(JSON.parse(retry.body).submissionKey, "first-key");
  assert.equal(retry.body, original.body);
});

test("changes to every contact field, notes or consent mint a new key", () => {
  const original = prepareQuoteSubmission(payload(), null, () => "first-key");
  for (const [field, value] of Object.entries(payload()).filter(([field]) => field !== "items")) {
    const changed = { ...payload(), [field]: typeof value === "boolean" ? !value : `${value} ` };
    const next = prepareQuoteSubmission(changed, original, () => "new-key");
    assert.equal(next.submissionKey, "new-key", field);
    assert.notEqual(next.body, original.body, field);
  }
});

test("quantity, SKU, addition, removal and item order changes mint new keys", () => {
  const original = prepareQuoteSubmission(payload(), null, () => "first-key");
  for (const items of [
    [{ sku: "SKU-1", quantity: 3 }, { sku: "SKU-2", quantity: 1 }],
    [{ sku: "SKU-3", quantity: 2 }, { sku: "SKU-2", quantity: 1 }],
    [...payload().items, { sku: "SKU-3", quantity: 1 }],
    payload().items.slice(0, 1),
    payload().items.reverse(),
  ]) {
    const next = prepareQuoteSubmission({ ...payload(), items }, original, () => "new-key");
    assert.equal(next.submissionKey, "new-key");
    assert.deepEqual(JSON.parse(next.body).items, items);
  }
});

test("keeps an immutable snapshot even when the original form and items mutate", () => {
  const input = payload();
  const original = prepareQuoteSubmission(input, null, () => "first-key");
  input.firstName = "Changed";
  input.items[0]!.quantity = 5;
  assert.equal(JSON.parse(original.body).firstName, "Alex");
  assert.equal(JSON.parse(original.body).items[0].quantity, 2);
  const changed = prepareQuoteSubmission(input, original, () => "second-key");
  const reverted = prepareQuoteSubmission(payload(), changed, () => "third-key");
  assert.equal(reverted.submissionKey, "third-key");
});
