import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { writeEnvAtomically } from "../scripts/utils/write-env";

const original = "DATABASE_URL=preserve-database\nRESEND_API_KEY=preserve-key\n";
const replacement = `${original}NUXT_ADMIN_EMAIL=team@example.com\n`;

async function environmentFile(t: TestContext, existing = true) {
  const directory = await fs.mkdtemp(join(tmpdir(), "indigenous-admin-env-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const path = join(directory, ".env");
  if (existing) await fs.writeFile(path, original, { mode: 0o644 });
  return { directory, path };
}

test("the original env stays intact until a complete, private temporary file is renamed over it", async (t) => {
  const { directory, path } = await environmentFile(t);
  const rename = fs.rename;
  const replace = t.mock.method(fs, "rename", async (source, destination) => {
    assert.equal(dirname(String(source)), dirname(path));
    assert.equal(destination, path);
    assert.equal(await fs.readFile(path, "utf8"), original);
    assert.equal(await fs.readFile(source, "utf8"), replacement);
    assert.equal((await fs.stat(source)).mode & 0o777, 0o600);
    await rename(source, destination);
  });
  await writeEnvAtomically(path, replacement);
  assert.equal(replace.mock.calls.length, 1);
  assert.equal(await fs.readFile(path, "utf8"), replacement);
  assert.equal((await fs.stat(path)).mode & 0o777, 0o600);
  assert.deepEqual(await fs.readdir(directory), [".env"]);
});

test("setup can create a new private env file", async (t) => {
  const { directory, path } = await environmentFile(t, false);
  await writeEnvAtomically(path, replacement);
  assert.equal(await fs.readFile(path, "utf8"), replacement);
  assert.equal((await fs.stat(path)).mode & 0o777, 0o600);
  assert.deepEqual(await fs.readdir(directory), [".env"]);
});

test("a partial temporary write cannot truncate the original env and is cleaned up", async (t) => {
  const { directory, path } = await environmentFile(t);
  const open = fs.open;
  const failure = new Error("Simulated interrupted write");
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    const file = await open(...args);
    const write = file.writeFile.bind(file);
    t.mock.method(file, "writeFile", async () => {
      await write("partial replacement");
      throw failure;
    });
    return file;
  });
  await assert.rejects(writeEnvAtomically(path, replacement), failure);
  assert.equal(await fs.readFile(path, "utf8"), original);
  assert.deepEqual(await fs.readdir(directory), [".env"]);
});

test("a failed rename preserves unrelated settings and removes the temporary file", async (t) => {
  const { directory, path } = await environmentFile(t);
  const failure = new Error("Simulated rename failure");
  t.mock.method(fs, "rename", async () => { throw failure; });
  await assert.rejects(writeEnvAtomically(path, replacement), failure);
  assert.equal(await fs.readFile(path, "utf8"), original);
  assert.deepEqual(await fs.readdir(directory), [".env"]);
});
