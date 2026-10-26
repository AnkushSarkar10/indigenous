import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationName = "20261025120000_add_quote_reference";
const migrationRoot = new URL("../prisma/migrations/", import.meta.url);
const migration = await readFile(new URL(`${migrationName}/migration.sql`, migrationRoot), "utf8");

async function beforeMigration() {
  const db = await PGlite.create();
  try {
    const directories = await readdir(migrationRoot, { withFileTypes: true });
    for (const directory of directories.filter((entry) => entry.isDirectory() && entry.name < migrationName).sort((a, b) => a.name.localeCompare(b.name))) {
      await db.exec(await readFile(new URL(`${directory.name}/migration.sql`, migrationRoot), "utf8"));
    }
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

test("backfills unique short references without changing existing requests or item links", async (t) => {
  const db = await beforeMigration();
  t.after(() => db.close());
  await db.exec(`INSERT INTO "quote_requests" ("id", "firstName", "lastName", "email", "contactNumber", "consentVersion", "captchaId")
    SELECT 'quote-' || n, 'Alex', 'Taylor', 'alex@example.com', '+91 9876543210', '2026-10-24', 'retry-' || n FROM generate_series(1, 200) AS n`);
  await db.exec(`INSERT INTO "products" ("id", "sku", "name", "specialty", "category") VALUES (1, 'SKU-1', 'Instrument', 'Urology', 'Equipment')`);
  await db.exec(`INSERT INTO "quote_request_items" ("quoteRequestId", "productId", "quantity", "skuSnapshot", "nameSnapshot") VALUES ('quote-1', 1, 2, 'SKU-1', 'Instrument')`);
  await db.exec(migration);

  const { rows } = await db.query<{ id: string; reference: string; captchaId: string }>(`SELECT "id", "reference", "captchaId" FROM "quote_requests"`);
  assert.equal(rows.length, 200);
  assert.equal(new Set(rows.map((row) => row.reference)).size, 200);
  for (const row of rows) {
    assert.match(row.reference, /^[A-Z]{3}-[0-9]{3}$/);
    assert.equal(row.captchaId, row.id.replace("quote-", "retry-"));
  }
  assert.deepEqual((await db.query(`SELECT "quoteRequestId", "productId"::text, "quantity" FROM "quote_request_items"`)).rows,
    [{ quoteRequestId: "quote-1", productId: "1", quantity: 2 }]);

  const constraint = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
  await assert.rejects(db.query(`UPDATE "quote_requests" SET "reference" = $1 WHERE "id" = 'quote-2'`, [rows.find((row) => row.id === "quote-1")!.reference]), constraint("23505"));
  await assert.rejects(db.exec(`UPDATE "quote_requests" SET "reference" = 'bad-123' WHERE "id" = 'quote-1'`), constraint("23514"));
  await assert.rejects(db.exec(`UPDATE "quote_requests" SET "reference" = NULL WHERE "id" = 'quote-1'`), constraint("23502"));
});

test("applies to an empty database and stores references on new requests", async (t) => {
  const db = await beforeMigration();
  t.after(() => db.close());
  await db.exec(migration);
  await db.exec(`INSERT INTO "quote_requests" ("id", "reference", "firstName", "lastName", "email", "contactNumber", "consentVersion", "captchaId")
    VALUES ('quote-new', 'IND-323', 'Alex', 'Taylor', 'alex@example.com', '+91 9876543210', '2026-10-24', 'retry-new')`);
  assert.deepEqual((await db.query(`SELECT "reference" FROM "quote_requests" WHERE "captchaId" = 'retry-new'`)).rows, [{ reference: "IND-323" }]);
});
