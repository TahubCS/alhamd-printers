import { beforeEach, describe, expect, it } from "vitest";
import { createBankAccount, deleteCompany, getCompanies, saveCompany, setBankAccountActive, setDefaultCompany } from "@/actions/settings";
import { getBankAccounts } from "@/actions/payment";
import { createInvoice } from "@/actions/invoice";
import { createCustomerRecord, hasTestDatabase, prisma, resetDatabase } from "./db";

describe.skipIf(!hasTestDatabase)("settings", () => {
    beforeEach(resetDatabase);

    it("makes the first company the default and keeps exactly one default", async () => {
        const first = await saveCompany(null, { name: "Alpha Prints" });
        const second = await saveCompany(null, { name: "Beta Packaging", email: "" });
        expect(first.success && second.success).toBe(true);

        let companies = (await getCompanies()).data!;
        expect(companies.filter((c) => c.isDefault).map((c) => c.name)).toEqual(["Alpha Prints"]);

        await setDefaultCompany(second.data!.id);
        companies = (await getCompanies()).data!;
        expect(companies.filter((c) => c.isDefault).map((c) => c.name)).toEqual(["Beta Packaging"]);
    });

    it("rejects invalid logos and emails", async () => {
        expect((await saveCompany(null, { name: "X", logoUrl: "javascript:alert(1)" })).success).toBe(false);
        expect((await saveCompany(null, { name: "X", email: "not-an-email" })).success).toBe(false);
    });

    it("refuses to delete the default company or one with invoices", async () => {
        const main = (await saveCompany(null, { name: "Main" })).data!.id;
        const other = (await saveCompany(null, { name: "Other" })).data!.id;
        expect((await deleteCompany(main)).success).toBe(false);

        const customer = await createCustomerRecord();
        await createInvoice({
            companyId: other, customerId: customer.id, date: new Date(), creditDays: 0,
            items: [{ description: "Bags", quantity: 1, rate: 10 }],
        });
        const result = await deleteCompany(other);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/1 invoice/);
    });

    it("stores only the last four digits and hides inactive accounts from payments", async () => {
        expect((await createBankAccount({ bankName: "HBL", accountTitle: "Demo", lastFourDigits: "12345" })).success).toBe(false);
        expect((await createBankAccount({ bankName: "HBL", accountTitle: "Demo", lastFourDigits: "4321" })).success).toBe(true);

        const account = await prisma.bankAccount.findFirstOrThrow();
        expect(account.accountNumberMasked).toBe("****4321");

        await setBankAccountActive(account.id, false);
        expect((await getBankAccounts()).data).toHaveLength(0);
    });
});
