import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/layout/PageHeader";
import SupplierForm from "@/components/suppliers/SupplierForm";

export default async function NewSupplierPage() {
    const t = await getTranslations("suppliers");
    return (
        <div className="mx-auto max-w-3xl animate-fade-in">
            <PageHeader title={t("newSupplier")} subtitle={t("formSubtitle")} />
            <SupplierForm />
        </div>
    );
}
