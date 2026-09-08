/*
  Warnings:

  - You are about to drop the `order_request_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_requests` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `category` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "order_request_items" DROP CONSTRAINT "order_request_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_request_items" DROP CONSTRAINT "order_request_items_request_id_fkey";

-- DropIndex
DROP INDEX "products_category_is_active_idx";

-- AlterTable
ALTER TABLE "products" RENAME COLUMN "image_url" TO "image_path";
ALTER TABLE "products" RENAME COLUMN "is_active" TO "is_available";
ALTER TABLE "products" ALTER COLUMN "category" SET NOT NULL;

-- DropTable
DROP TABLE "order_request_items";

-- DropTable
DROP TABLE "order_requests";

-- DropEnum
DROP TYPE "request_status";

-- CreateIndex
CREATE INDEX "products_category_is_available_idx" ON "products"("category", "is_available");
