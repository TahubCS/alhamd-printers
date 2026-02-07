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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("newCustomer")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <div className="max-w-2xl">
                <CustomerForm mode="create" locale={locale} />
            </div>
        </div>
    );
}
