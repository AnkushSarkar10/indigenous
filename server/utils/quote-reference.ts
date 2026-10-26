import { randomInt } from "node:crypto";

export function generateQuoteReference() {
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + randomInt(26))).join("");
  return `${letters}-${randomInt(1000).toString().padStart(3, "0")}`;
}

export class QuoteReferenceUnavailableError extends Error {
  constructor() {
    super("Could not allocate a unique quote reference.");
  }
}

export async function saveWithQuoteReference<T>(
  save: (reference: string) => Promise<T>,
  findExisting: () => Promise<T | null>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await save(generateQuoteReference());
    } catch (error) {
      const conflict = error as { code?: string; meta?: { target?: unknown } } | null;
      if (conflict?.code !== "P2002") throw error;

      // A simultaneous retry may have already saved this submission.
      const existing = await findExisting();
      if (existing) return existing;

      const target = conflict.meta?.target;
      const referenceConflict = Array.isArray(target)
        ? target.includes("reference")
        : target === "reference" || target === "quote_requests_reference_key";
      if (!referenceConflict) throw error;
    }
  }

  throw new QuoteReferenceUnavailableError();
}
