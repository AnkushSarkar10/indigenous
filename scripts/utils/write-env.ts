import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";

/** Replace an env file only after its private temporary copy is fully written. */
export async function writeEnvAtomically(envPath: string, contents: string) {
  const tempPath = `${envPath}.${randomUUID()}.tmp`;
  const file = await fs.open(tempPath, "wx", 0o600);
  try {
    await file.chmod(0o600);
    await file.writeFile(contents, "utf8");
    await file.sync();
    await file.close();
    await fs.rename(tempPath, envPath);
  } finally {
    try { await file.close(); }
    finally { await fs.rm(tempPath, { force: true }); }
  }
}
