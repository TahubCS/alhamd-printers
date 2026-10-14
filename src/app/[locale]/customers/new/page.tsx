import { CustomerForm } from "@/components/customers/CustomerForm";
import { getTranslations } from "next-intl/server";

export default async function NewCustomerPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations("customers");

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">{t("newCustomer")}</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
            </div>
            <div className="max-w-2xl">
                <CustomerForm mode="create" locale={locale} />
            </div>
        </div>
    );
}
