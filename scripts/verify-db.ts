import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const url = process.env.DATABASE_URL;
    console.log('DATABASE_URL defined:', !!url);
    if (url) console.log('DATABASE_URL starts with:', url.substring(0, 15) + '...');

    console.log('Connecting to database...');
    try {
        const customers = await prisma.customer.findMany({ take: 1 });
        console.log('Successfully fetched customers:', customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
