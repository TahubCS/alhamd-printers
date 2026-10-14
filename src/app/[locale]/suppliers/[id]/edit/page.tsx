import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupplierById } from "@/actions/supplier";
import PageHeader from "@/components/layout/PageHeader";
import SupplierForm from "@/components/suppliers/SupplierForm";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const t = await getTranslations("suppliers");
    const { data: supplier } = await getSupplierById(id);
    if (!supplier) notFound();
    return (
        <div className="mx-auto max-w-3xl animate-fade-in p-3 rtl:p-4">
            <PageHeader title={t("editSupplier")} subtitle={supplier.name} />
            <SupplierForm supplier={supplier} />
        </div>
    );
}
