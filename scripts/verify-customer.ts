
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting...');
    try {
        const customers = await prisma.customer.findMany({ take: 1 });
        console.log('Success. Count:', customers.length);
    } catch (e) {
        console.error('FAIL:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
