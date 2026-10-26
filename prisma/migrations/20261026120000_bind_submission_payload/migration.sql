-- Historical request bodies cannot be reconstructed byte-for-byte. Leave their
-- hashes NULL so their keys cannot silently accept a different payload.
ALTER TABLE "quote_requests" ADD COLUMN "submissionPayloadHash" CHAR(64);
