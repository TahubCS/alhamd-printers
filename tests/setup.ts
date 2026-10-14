import { vi } from "vitest";

// Integration tests run against a disposable database, never DATABASE_URL from .env
if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Server actions call revalidatePath, which needs a Next.js request context.
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));
