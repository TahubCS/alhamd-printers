-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "ntn" TEXT;

-- AlterTable
ALTER TABLE "CustomerPurchaseOrder" ADD COLUMN     "subtotal" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "taxTotal" DECIMAL(15,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "CustomerPurchaseOrderItem" ADD COLUMN     "customAttributes" JSONB DEFAULT '{}',
ADD COLUMN     "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT DEFAULT 'Pieces';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "taxTotal" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
