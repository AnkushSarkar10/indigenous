import assert from "node:assert/strict";
import { test } from "node:test";
import { generateQuoteReference, QuoteReferenceUnavailableError, saveWithQuoteReference } from "../server/utils/quote-reference";

const referenceConflict = { code: "P2002", meta: { target: ["reference"] } };

test("generates exactly three uppercase letters and three zero-padded digits", () => {
  for (let index = 0; index < 100; index++) {
    assert.match(generateQuoteReference(), /^[A-Z]{3}-[0-9]{3}$/);
  }
});

test("retries reference collisions and returns the saved reference", async () => {
  let attempts = 0;
  const result = await saveWithQuoteReference(async (reference) => {
    if (++attempts === 1) throw referenceConflict;
    return { reference };
  }, async () => null);
  assert.equal(attempts, 2);
  assert.match(result.reference, /^[A-Z]{3}-[0-9]{3}$/);
});

test("preserves the reference when a simultaneous submission has already saved", async () => {
  const existing = { reference: "IND-323" };
  let attempts = 0;
  const result = await saveWithQuoteReference(async () => {
    attempts++;
    throw { code: "P2002", meta: { target: ["captchaId"] } };
  }, async () => existing);
  assert.equal(result, existing);
  assert.equal(attempts, 1);
});

test("stops after five reference collisions", async () => {
  let attempts = 0;
  await assert.rejects(saveWithQuoteReference(async () => {
    attempts++;
    throw referenceConflict;
  }, async () => null), QuoteReferenceUnavailableError);
  assert.equal(attempts, 5);
});

test("does not retry unrelated database failures", async () => {
  for (const error of [new Error("Database unavailable"), null, { code: "P2002", meta: { target: ["productId"] } }]) {
    let attempts = 0;
    await assert.rejects(saveWithQuoteReference(async () => {
      attempts++;
      throw error;
    }, async () => null), (caught) => caught === error);
    assert.equal(attempts, 1);
  }
});
