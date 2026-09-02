/*
  Warnings:

  - You are about to drop the column `image_url` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `products` table. All the data in the column will be lost.
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
ALTER TABLE "products" DROP COLUMN "image_url",
DROP COLUMN "is_active",
ADD COLUMN     "image_path" TEXT,
ADD COLUMN     "is_available" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "category" SET NOT NULL;

-- DropTable
DROP TABLE "order_request_items";

-- DropTable
DROP TABLE "order_requests";

-- DropEnum
DROP TYPE "request_status";

-- CreateIndex
CREATE INDEX "products_category_is_available_idx" ON "products"("category", "is_available");
