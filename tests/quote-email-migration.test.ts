import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("confirmation jobs are unique, atomic with quotes, and cascade on deletion", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  const root = new URL("../prisma/migrations/", import.meta.url);
  const directories = await readdir(root, { withFileTypes: true });
  for (const directory of directories.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    await db.exec(await readFile(new URL(`${directory.name}/migration.sql`, root), "utf8"));
  }
  const saveQuote = `INSERT INTO "quote_requests" ("id", "reference", "firstName", "lastName", "email", "contactNumber", "consentVersion", "captchaId") VALUES ('quote-1', 'IND-323', 'Alex', 'Taylor', 'delivered@resend.dev', '+91 9876543210', '2026-10-24', 'retry-1')`;
  await db.exec(saveQuote);
  await db.query(`INSERT INTO "quote_confirmation_emails" ("quoteRequestId", "payload") VALUES ('quote-1', $1)`, [JSON.stringify({ subject: "Quote IND-323" })]);
  assert.deepEqual((await db.query(`SELECT "status", "attempts" FROM "quote_confirmation_emails"`)).rows, [{ status: "pending", attempts: 0 }]);
  await assert.rejects(db.exec(`INSERT INTO "quote_confirmation_emails" ("quoteRequestId", "payload") VALUES ('quote-1', '{}')`), (e: unknown) => (e as { code: string }).code === "23505");
  await db.exec(`DELETE FROM "quote_requests" WHERE "id" = 'quote-1'`);
  assert.deepEqual((await db.query(`SELECT * FROM "quote_confirmation_emails"`)).rows, []);
  await db.exec("BEGIN");
  await db.exec(saveQuote);
  await assert.rejects(db.exec(`INSERT INTO "quote_confirmation_emails" ("quoteRequestId", "payload", "status") VALUES ('quote-1', '{}', 'invalid')`));
  await db.exec("ROLLBACK");
  assert.deepEqual((await db.query(`SELECT * FROM "quote_requests"`)).rows, []);
});
