import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create a singleton connection pool
// This prevents creating too many connections during hot reload
const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
    // Use pg driver adapter for Prisma 7 compatibility
    // Configure SSL to accept Supabase self-signed certificates
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        // Add logging only in development
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
