import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationName = "20261024143000_link_quote_items_to_products";
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

async function saveOldQuote(db: PGlite, sku: string) {
  await db.query(`INSERT INTO "quote_requests" ("id", "firstName", "lastName", "organisation", "email", "contactNumber", "address", "items", "consentVersion", "captchaId")
    VALUES ('quote-1', 'Alex', 'Taylor', '', 'alex@example.com', '+91 9876543210', '', $1::jsonb, '2026-10-24', 'retry-1')`,
  [JSON.stringify([{ sku, name: "Original catalogue name", quantity: 2 }])]);
}

test("migrates existing snapshots to real product IDs and enforces quote-item integrity", async (t) => {
  const db = await beforeMigration();
  t.after(() => db.close());
  // Above Number.MAX_SAFE_INTEGER to exercise the catalogue's BigInt IDs.
  await db.exec(`INSERT INTO "products" ("id", "sku", "name", "specialty", "category") VALUES (9007199254740993, 'SKU-1', 'Current catalogue name', 'Urology', 'Equipment')`);
  await saveOldQuote(db, "SKU-1");
  await db.exec(migration);

  const result = await db.query(`SELECT "productId"::text AS "productId", "quantity", "skuSnapshot", "nameSnapshot" FROM "quote_request_items" WHERE "quoteRequestId" = 'quote-1'`);
  assert.deepEqual(result.rows, [{ productId: "9007199254740993", quantity: 2, skuSnapshot: "SKU-1", nameSnapshot: "Original catalogue name" }]);
  await db.exec(`UPDATE "products" SET "name" = 'Renamed product', "sku" = 'SKU-RENAMED' WHERE "id" = 9007199254740993`);
  assert.deepEqual((await db.query(`SELECT "skuSnapshot", "nameSnapshot" FROM "quote_request_items"`)).rows, [{ skuSnapshot: "SKU-1", nameSnapshot: "Original catalogue name" }]);

  const constraint = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
  await assert.rejects(db.exec(`DELETE FROM "products" WHERE "id" = 9007199254740993`), (error: unknown) => (error as { constraint?: string }).constraint === "quote_request_items_productId_fkey");
  await assert.rejects(db.exec(`INSERT INTO "quote_request_items" ("quoteRequestId", "productId", "quantity", "skuSnapshot", "nameSnapshot") VALUES ('quote-1', 123, 1, 'UNKNOWN', 'Unknown')`), constraint("23503"));
  await assert.rejects(db.exec(`INSERT INTO "quote_request_items" ("quoteRequestId", "productId", "quantity", "skuSnapshot", "nameSnapshot") VALUES ('quote-1', 9007199254740993, 1, 'SKU-1', 'Duplicate')`), constraint("23505"));
  await assert.rejects(db.exec(`UPDATE "quote_request_items" SET "quantity" = 0`), constraint("23514"));
  await db.exec(`DELETE FROM "quote_requests" WHERE "id" = 'quote-1'`);
  assert.deepEqual((await db.query(`SELECT * FROM "quote_request_items"`)).rows, []);
  await db.exec(`DELETE FROM "products" WHERE "id" = 9007199254740993`);
});

test("applies cleanly to an empty database and allows optional contact fields", async (t) => {
  const db = await beforeMigration();
  t.after(() => db.close());
  await db.exec(migration);
  await db.exec(`INSERT INTO "quote_requests" ("id", "firstName", "lastName", "email", "contactNumber", "consentVersion", "captchaId") VALUES ('quote-empty', 'Alex', 'Taylor', 'alex@example.com', '+91 9876543210', '2026-10-24', 'retry-empty')`);
  assert.deepEqual((await db.query(`SELECT "organisation", "address" FROM "quote_requests"`)).rows, [{ organisation: null, address: null }]);
  assert.deepEqual((await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'items'`)).rows, []);
});

test("missing catalogue SKUs abort the migration without losing the original JSON", async (t) => {
  const db = await beforeMigration();
  t.after(() => db.close());
  await saveOldQuote(db, "MISSING-SKU");
  await assert.rejects(db.exec(migration), /saved SKU is missing from products/);
  await db.exec("ROLLBACK");
  const saved = await db.query<{ items: unknown }>(`SELECT "items" FROM "quote_requests" WHERE "id" = 'quote-1'`);
  assert.deepEqual(saved.rows[0]?.items, [{ sku: "MISSING-SKU", name: "Original catalogue name", quantity: 2 }]);
  assert.deepEqual((await db.query(`SELECT to_regclass('quote_request_items') AS name`)).rows, [{ name: null }]);
  await db.exec(`INSERT INTO "products" ("id", "sku", "name", "specialty", "category") VALUES (1, 'MISSING-SKU', 'Restored product', 'Urology', 'Equipment')`);
  await db.exec(migration);
  assert.deepEqual((await db.query(`SELECT "productId"::text AS id FROM "quote_request_items"`)).rows, [{ id: "1" }]);
});
