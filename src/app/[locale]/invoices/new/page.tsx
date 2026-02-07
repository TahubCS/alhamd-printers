import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getTranslations } from "next-intl/server";

export default async function NewInvoicePage() {
    const t = await getTranslations("invoices.form");

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("createTitle")}</h1>
                <p className="text-muted-foreground">{t("notes")}</p>
            </div>
            <InvoiceForm />
        </div>
    );
}
