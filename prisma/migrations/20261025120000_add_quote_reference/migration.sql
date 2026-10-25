BEGIN;

ALTER TABLE "quote_requests" ADD COLUMN "reference" VARCHAR(7);
CREATE UNIQUE INDEX "quote_requests_reference_key" ON "quote_requests"("reference");

-- Give existing requests their own short reference while preserving their IDs
-- and all quote-item relationships. Retry any randomly generated collision.
DO $$
DECLARE
    request_id TEXT;
    candidate TEXT;
BEGIN
    FOR request_id IN SELECT "id" FROM "quote_requests" ORDER BY "createdAt", "id" LOOP
        LOOP
            candidate := chr(65 + floor(random() * 26)::int)
                || chr(65 + floor(random() * 26)::int)
                || chr(65 + floor(random() * 26)::int)
                || '-' || lpad(floor(random() * 1000)::text, 3, '0');
            BEGIN
                UPDATE "quote_requests" SET "reference" = candidate WHERE "id" = request_id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                CONTINUE;
            END;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE "quote_requests"
    ALTER COLUMN "reference" SET NOT NULL,
    ADD CONSTRAINT "quote_requests_reference_format" CHECK ("reference" ~ '^[A-Z]{3}-[0-9]{3}$');

COMMIT;
