import { getCustomerById } from "@/actions/customer";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const t = await getTranslations("customers");

    const { success, data: customer } = await getCustomerById(id);

    if (!success || !customer) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("editCustomer")}</h1>
                <p className="text-muted-foreground">{customer.name}</p>
            </div>
            <div className="max-w-2xl">
                <CustomerForm customer={customer} mode="edit" locale={locale} />
            </div>
        </div>
    );
}
