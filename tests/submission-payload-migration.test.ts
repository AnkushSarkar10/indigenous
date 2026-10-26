import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("adds payload hashes while preserving legacy requests and their references", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  const migrationName = "20261026120000_bind_submission_payload";
  const root = new URL("../prisma/migrations/", import.meta.url);
  const directories = await readdir(root, { withFileTypes: true });
  for (const directory of directories.filter((entry) => entry.isDirectory() && entry.name < migrationName).sort((a, b) => a.name.localeCompare(b.name))) {
    await db.exec(await readFile(new URL(`${directory.name}/migration.sql`, root), "utf8"));
  }
  await db.exec(`INSERT INTO "quote_requests" ("id", "reference", "firstName", "lastName", "email", "contactNumber", "consentVersion", "captchaId")
    VALUES ('quote-old', 'IND-323', 'Alex', 'Taylor', 'alex@example.com', '+91 9876543210', '2026-10-24', 'retry-old')`);
  await db.exec(await readFile(new URL(`${migrationName}/migration.sql`, root), "utf8"));
  assert.deepEqual((await db.query(`SELECT "id", "reference", "captchaId", "submissionPayloadHash" FROM "quote_requests"`)).rows,
    [{ id: "quote-old", reference: "IND-323", captchaId: "retry-old", submissionPayloadHash: null }]);
  const hash = "a".repeat(64);
  await db.query(`UPDATE "quote_requests" SET "submissionPayloadHash" = $1 WHERE "id" = 'quote-old'`, [hash]);
  assert.deepEqual((await db.query(`SELECT "submissionPayloadHash" FROM "quote_requests"`)).rows, [{ submissionPayloadHash: hash }]);
});
