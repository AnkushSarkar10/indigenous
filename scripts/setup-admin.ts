import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents, type Key } from "node:readline";
import { resolve } from "node:path";
import { hashAdminPassword } from "../server/utils/admin-password";

function passwordPrompt(prompt: string): Promise<string> {
  return new Promise((resolvePassword, reject) => {
    const wasRaw = process.stdin.isRaw;
    let password = "";
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = () => {
      process.stdin.off("keypress", onKey);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onKey = (text: string | undefined, key: Key) => {
      if (key.ctrl && key.name === "c") { finish(); reject(new Error("Setup cancelled.")); }
      else if (key.name === "return" || key.name === "enter") { finish(); resolvePassword(password); }
      else if (key.name === "backspace") { password = Array.from(password).slice(0, -1).join(""); }
      else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text) && Buffer.byteLength(password + text) <= 1024) { password += text; }
    };
    process.stdin.on("keypress", onKey);
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run pnpm admin:setup in an interactive terminal. Passwords are never accepted as command arguments.");
  const envPath = resolve(".env");
  let contents = "";
  try { contents = await readFile(envPath, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

  console.log("Set the shared admin login. Existing admin sessions will be signed out.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await rl.question("Shared email: ")).trim().toLowerCase();
  rl.close();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Please enter a valid email address.");
  const password = await passwordPrompt("Password (at least 12 characters, hidden): ");
  if (Array.from(password).length < 12) throw new Error("Use a password with at least 12 characters.");
  if (await passwordPrompt("Confirm password (hidden): ") !== password) throw new Error("Passwords did not match. No settings were changed.");

  const settings = {
    NUXT_ADMIN_EMAIL: email,
    NUXT_ADMIN_PASSWORD_HASH: await hashAdminPassword(password),
    NUXT_ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"),
  };
  for (const [key, value] of Object.entries(settings)) {
    const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "gm");
    const line = `${key}=${value}`;
    if (pattern.test(contents)) contents = contents.replace(pattern, line);
    else contents = `${contents}${contents.endsWith("\n") || !contents ? "" : "\n"}${line}\n`;
  }
  await writeFile(envPath, contents, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.log("Admin credentials saved to .env. Restart the app, then open /admin. For hosting, copy the three NUXT_ADMIN_* settings into the server environment.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Admin setup failed.");
  process.exitCode = 1;
});
