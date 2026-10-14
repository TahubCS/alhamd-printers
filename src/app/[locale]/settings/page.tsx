import { getTranslations } from "next-intl/server";
import { getAllBankAccounts, getCompanies } from "@/actions/settings";
import PageHeader from "@/components/layout/PageHeader";
import CompanySettings from "@/components/settings/CompanySettings";
import BankAccountSettings from "@/components/settings/BankAccountSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const t = await getTranslations("settings");
    const [{ data: companies }, { data: accounts }] = await Promise.all([getCompanies(), getAllBankAccounts()]);

    return (
        <div className="animate-fade-in">
            <PageHeader title={t("title")} subtitle={t("subtitle")} />
            <div className="space-y-8">
                <CompanySettings
                    companies={(companies ?? []).map((c) => ({
                        id: c.id,
                        name: c.name,
                        nameUrdu: c.nameUrdu,
                        address: c.address,
                        phone: c.phone,
                        email: c.email,
                        website: c.website,
                        logoUrl: c.logoUrl,
                        isDefault: c.isDefault,
                        invoiceCount: c._count.invoices,
                    }))}
                />
                <BankAccountSettings
                    accounts={(accounts ?? []).map((a) => ({
                        id: a.id,
                        bankName: a.bankName,
                        accountTitle: a.accountTitle,
                        accountNumberMasked: a.accountNumberMasked,
                        isActive: a.isActive,
                        paymentCount: a._count.payments,
                    }))}
                />
            </div>
        </div>
    );
}
