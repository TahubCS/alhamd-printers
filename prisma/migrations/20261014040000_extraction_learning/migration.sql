-- CreateTable
CREATE TABLE "CustomerAlias" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timesConfirmed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAlias" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timesConfirmed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAlias_normalizedName_key" ON "CustomerAlias"("normalizedName");

-- CreateIndex
CREATE INDEX "CustomerAlias_customerId_idx" ON "CustomerAlias"("customerId");

-- CreateIndex
CREATE INDEX "ProductAlias_productId_idx" ON "ProductAlias"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlias_customerId_normalizedText_key" ON "ProductAlias"("customerId", "normalizedText");

-- AddForeignKey
ALTER TABLE "CustomerAlias" ADD CONSTRAINT "CustomerAlias_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
