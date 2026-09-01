-- Keep one category name and one primary image directly on each product.
ALTER TABLE "products"
    ADD COLUMN "category" TEXT,
    ADD COLUMN "image_url" TEXT;

UPDATE "products" AS p
SET "category" = c."name"
FROM "product_categories" AS c
WHERE c."id" = p."category_id";

UPDATE "products" AS p
SET "image_url" = (
    SELECT "url"
    FROM "product_images"
    WHERE "product_id" = p."id"
    ORDER BY "is_primary" DESC, "display_order", "id"
    LIMIT 1
);

-- Remove structures that are unnecessary for the minimal workflow.
DROP TABLE "request_status_history";
DROP TABLE "product_images";

ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";
ALTER TABLE "products"
    DROP COLUMN "category_id",
    DROP COLUMN "slug",
    DROP COLUMN "short_description",
    DROP COLUMN "manufacturer",
    DROP COLUMN "model_number",
    DROP COLUMN "is_featured",
    DROP COLUMN "display_order",
    DROP COLUMN "created_at",
    DROP COLUMN "updated_at";

DROP TABLE "product_categories";

ALTER TABLE "order_requests"
    DROP COLUMN "contact_email",
    DROP COLUMN "assigned_to_user_id",
    DROP COLUMN "updated_at";

ALTER TABLE "order_request_items"
    DROP COLUMN "product_sku",
    DROP COLUMN "product_name",
    DROP COLUMN "notes",
    DROP COLUMN "created_at";

CREATE INDEX "products_category_is_active_idx" ON "products"("category", "is_active");
