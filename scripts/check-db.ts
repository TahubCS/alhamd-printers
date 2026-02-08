
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const cpoCount = await prisma.customerPurchaseOrder.count();
        const invoiceCount = await prisma.invoice.count();
        const paymentCount = await prisma.payment.count();
        const bankAccountCount = await prisma.bankAccount.count();
        const customerCount = await prisma.customer.count();

        console.log('--- DATABASE COUNTS ---');
        console.log(`Cust. Purchase Orders: ${cpoCount}`);
        console.log(`Invoices: ${invoiceCount}`);
        console.log(`Payments: ${paymentCount}`);
        console.log(`Bank Accounts: ${bankAccountCount}`);
        console.log(`Customers: ${customerCount}`);
        console.log('-----------------------');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
