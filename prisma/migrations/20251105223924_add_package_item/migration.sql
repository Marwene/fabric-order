/*
  Warnings:

  - You are about to drop the `_OrderToQualityCheck` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quality_check` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QualityCheckStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- DropForeignKey
ALTER TABLE "_OrderToQualityCheck" DROP CONSTRAINT "_OrderToQualityCheck_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrderToQualityCheck" DROP CONSTRAINT "_OrderToQualityCheck_B_fkey";

-- DropTable
DROP TABLE "_OrderToQualityCheck";

-- DropTable
DROP TABLE "quality_check";

-- CreateTable
CREATE TABLE "package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" "QualityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "inspector" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_items_packageId_orderItemId_key" ON "package_items"("packageId", "orderItemId");

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
