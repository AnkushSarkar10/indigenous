/*
  Warnings:

  - Added the required column `specialty` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "products_category_is_available_idx";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "specialty" TEXT NOT NULL;
