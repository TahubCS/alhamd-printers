import { prisma } from "@/lib/prisma";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/** Empty every application table between tests. */
export async function resetDatabase() {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length === 0) return;
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function createCompany(id = "test-co") {
    return prisma.company.create({ data: { id, name: "Test Printing Co.", isDefault: true } });
}

export async function createCustomerRecord(name = "Test Customer") {
    return prisma.customer.create({ data: { name } });
}

export { prisma };
