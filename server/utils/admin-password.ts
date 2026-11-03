import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Fixed parameters keep password verification bounded, including malformed config.
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const hashPattern = /^scrypt:32768:8:3:([a-f0-9]{32}):([a-f0-9]{128})$/;

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, key) => error ? reject(error) : resolve(key));
  });
}

export function isAdminPasswordHash(value: string) {
  return hashPattern.test(value);
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt:32768:8:3:${salt}:${key.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, hash: string) {
  const match = hashPattern.exec(hash);
  if (!match || !password || Buffer.byteLength(password) > 1024) return false;
  return timingSafeEqual(await derive(password, match[1]!), Buffer.from(match[2]!, "hex"));
}
