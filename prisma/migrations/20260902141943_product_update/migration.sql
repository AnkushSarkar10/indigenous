-- DropIndex
DROP INDEX "products_category_is_available_idx";

-- AlterTable
ALTER TABLE "products" ADD COLUMN "specialty" TEXT;
UPDATE "products" SET "specialty" = 'Urology' WHERE "specialty" IS NULL;
ALTER TABLE "products" ALTER COLUMN "specialty" SET NOT NULL;
