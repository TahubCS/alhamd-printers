"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Logos are stored inline (as a data URL or link) so the app needs no file storage
const MAX_LOGO_LENGTH = 300_000;

const optionalText = z.string().trim().optional().transform((value) => value || null);

const CompanySchema = z.object({
    name: z.string().trim().min(1, "Company name is required"),
    nameUrdu: optionalText,
    address: optionalText,
    phone: optionalText,
    email: z.string().trim().email("Invalid email address").optional().or(z.literal("")).transform((value) => value || null),
    website: optionalText,
    logoUrl: z
        .string()
        .max(MAX_LOGO_LENGTH, "Logo is too large. Use an image under 200 KB.")
        .refine((value) => !value || /^(https:\/\/|data:image\/(png|jpe?g|webp);base64,)/.test(value), "Logo must be an HTTPS link or a PNG/JPEG/WebP image")
        .optional()
        .transform((value) => value || null),
});

export type CompanyInput = z.input<typeof CompanySchema>;

const BankAccountSchema = z.object({
    bankName: z.string().trim().min(1, "Bank name is required"),
    accountTitle: z.string().trim().min(1, "Account title is required"),
    lastFourDigits: z.string().trim().regex(/^\d{4}$/, "Enter exactly the last 4 digits"),
});

export type BankAccountInput = z.input<typeof BankAccountSchema>;

function firstIssue(error: unknown, fallback: string) {
    return error instanceof z.ZodError ? error.issues[0].message : fallback;
}

function revalidateSettings() {
    revalidatePath("/settings");
    revalidatePath("/invoices");
}

// ============================================
// COMPANIES (invoicing brands)
// ============================================
export async function getCompanies() {
    try {
        const companies = await prisma.company.findMany({
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            include: { _count: { select: { invoices: true } } },
        });
        return { success: true, data: companies };
    } catch (error) {
        console.error("Get Companies Error:", error);
        return { success: false, error: "Failed to fetch companies", data: [] };
    }
}

export async function saveCompany(id: string | null, input: CompanyInput) {
    try {
        const data = CompanySchema.parse(input);
        const company = await prisma.$transaction(async (tx) => {
            if (id) {
                return tx.company.update({ where: { id }, data });
            }
            // The first company becomes the default automatically
            const isFirst = (await tx.company.count()) === 0;
            return tx.company.create({ data: { ...data, isDefault: isFirst } });
        });
        revalidateSettings();
        return { success: true, data: { id: company.id } };
    } catch (error) {
        console.error("Save Company Error:", error);
        return { success: false, error: firstIssue(error, "Failed to save company") };
    }
}

export async function setDefaultCompany(id: string) {
    try {
        await prisma.$transaction([
            prisma.company.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
            prisma.company.update({ where: { id }, data: { isDefault: true } }),
        ]);
        revalidateSettings();
        return { success: true };
    } catch (error) {
        console.error("Set Default Company Error:", error);
        return { success: false, error: "Failed to update default company" };
    }
}

export async function deleteCompany(id: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { id },
            include: { _count: { select: { invoices: true } } },
        });
        if (!company) return { success: false, error: "Company not found" };
        if (company._count.invoices > 0) {
            return { success: false, error: `"${company.name}" has ${company._count.invoices} invoice(s) and cannot be deleted` };
        }
        if (company.isDefault) {
            return { success: false, error: "Choose another default company before deleting this one" };
        }
        await prisma.company.delete({ where: { id } });
        revalidateSettings();
        return { success: true };
    } catch (error) {
        console.error("Delete Company Error:", error);
        return { success: false, error: "Failed to delete company" };
    }
}

// ============================================
// BANK ACCOUNTS (deposit accounts for transfers)
// ============================================
export async function getAllBankAccounts() {
    try {
        const accounts = await prisma.bankAccount.findMany({
            orderBy: [{ isActive: "desc" }, { bankName: "asc" }],
            include: { _count: { select: { payments: true } } },
        });
        return { success: true, data: accounts };
    } catch (error) {
        console.error("Get Bank Accounts Error:", error);
        return { success: false, error: "Failed to fetch bank accounts", data: [] };
    }
}

export async function createBankAccount(input: BankAccountInput) {
    try {
        const data = BankAccountSchema.parse(input);
        // Only the last four digits are ever stored
        await prisma.bankAccount.create({
            data: {
                bankName: data.bankName,
                accountTitle: data.accountTitle,
                accountNumberMasked: `****${data.lastFourDigits}`,
            },
        });
        revalidateSettings();
        return { success: true };
    } catch (error) {
        console.error("Create Bank Account Error:", error);
        return { success: false, error: firstIssue(error, "Failed to add bank account") };
    }
}

export async function setBankAccountActive(id: string, isActive: boolean) {
    try {
        await prisma.bankAccount.update({ where: { id }, data: { isActive } });
        revalidateSettings();
        return { success: true };
    } catch (error) {
        console.error("Update Bank Account Error:", error);
        return { success: false, error: "Failed to update bank account" };
    }
}
