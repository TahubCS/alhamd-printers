import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getTranslations } from "next-intl/server";

export default async function NewInvoicePage() {
    const t = await getTranslations("invoices.form");

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{t("createTitle")}</h1>
                <p className="text-[var(--color-text-secondary)] mt-2">{t("notes")}</p>
            </div>
            <InvoiceForm />
        </div>
    );
}
