import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getTranslations } from "next-intl/server";

export default async function NewInvoicePage() {
    const t = await getTranslations("invoices.form");

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">{t("createTitle")}</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("createSubtitle")}</p>
            </div>
            <InvoiceForm />
        </div>
    );
}
