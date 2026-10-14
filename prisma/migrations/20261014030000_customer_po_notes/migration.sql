-- Keep payment terms and instructions captured from customer purchase orders
ALTER TABLE "CustomerPurchaseOrder" ADD COLUMN "notes" TEXT;
