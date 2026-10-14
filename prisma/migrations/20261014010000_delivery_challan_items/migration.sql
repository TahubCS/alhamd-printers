-- Delivery challans get structured line items and links to the customer and PO.

-- AlterTable: new optional columns
ALTER TABLE "DeliveryChallan" ADD COLUMN "customerPurchaseOrderId" TEXT,
ADD COLUMN "driverName" TEXT,
ADD COLUMN "vehicleNo" TEXT;

-- CreateTable
CREATE TABLE "DeliveryChallanItem" (
    "id" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Pieces',
    "customerPurchaseOrderItemId" TEXT,

    CONSTRAINT "DeliveryChallanItem_pkey" PRIMARY KEY ("id")
);

-- Preserve any existing single-line challans as one item each before dropping the old columns
INSERT INTO "DeliveryChallanItem" ("id", "challanId", "description", "quantity")
SELECT 'legacy_' || "id", "id", "items", "quantity" FROM "DeliveryChallan";

ALTER TABLE "DeliveryChallan" DROP COLUMN "items",
DROP COLUMN "quantity";

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_customerPurchaseOrderId_fkey" FOREIGN KEY ("customerPurchaseOrderId") REFERENCES "CustomerPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanItem" ADD CONSTRAINT "DeliveryChallanItem_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanItem" ADD CONSTRAINT "DeliveryChallanItem_customerPurchaseOrderItemId_fkey" FOREIGN KEY ("customerPurchaseOrderItemId") REFERENCES "CustomerPurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
