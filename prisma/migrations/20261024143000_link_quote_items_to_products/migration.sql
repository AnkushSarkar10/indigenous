BEGIN;

-- Match the optional contact fields in the application schema.
ALTER TABLE "quote_requests" ALTER COLUMN "organisation" DROP NOT NULL;
ALTER TABLE "quote_requests" ALTER COLUMN "address" DROP NOT NULL;

CREATE TABLE "quote_request_items" (
    "id" BIGSERIAL NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "productId" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    CONSTRAINT "quote_request_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_request_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 9999),
    CONSTRAINT "quote_request_items_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quote_request_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "quote_request_items_quoteRequestId_productId_key" ON "quote_request_items"("quoteRequestId", "productId");
CREATE INDEX "quote_request_items_productId_idx" ON "quote_request_items"("productId");

-- Abort instead of silently discarding historical items that cannot be linked.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "quote_requests" AS request
        CROSS JOIN LATERAL jsonb_array_elements(request."items") AS entry
        LEFT JOIN "products" AS product ON product."sku" = entry->>'sku'
        WHERE product."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot migrate quote items: a saved SKU is missing from products. Restore the matching catalogue products before retrying.';
    END IF;
END $$;

INSERT INTO "quote_request_items" ("quoteRequestId", "productId", "quantity", "skuSnapshot", "nameSnapshot")
SELECT request."id", product."id", (entry->>'quantity')::INTEGER, entry->>'sku', COALESCE(entry->>'name', product."name")
FROM "quote_requests" AS request
CROSS JOIN LATERAL jsonb_array_elements(request."items") AS entry
JOIN "products" AS product ON product."sku" = entry->>'sku';

ALTER TABLE "quote_requests" DROP COLUMN "items";

COMMIT;
