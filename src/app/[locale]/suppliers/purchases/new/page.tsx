import { getTranslations } from "next-intl/server";
import { getRawMaterials } from "@/actions/inventory";
import { getSuppliers } from "@/actions/supplier";
import PageHeader from "@/components/layout/PageHeader";
import PurchaseForm from "@/components/suppliers/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ supplierId?: string }>;
}) {
    const { locale } = await params;
    const { supplierId } = await searchParams;
    const t = await getTranslations("suppliers");
    const [{ data: suppliers = [] }, { data: materials = [] }] = await Promise.all([getSuppliers(), getRawMaterials()]);

    return (
        <div className="mx-auto max-w-5xl animate-fade-in p-3 rtl:p-4">
            <PageHeader title={t("newPurchase")} subtitle={t("purchaseSubtitle")} />
            <PurchaseForm
                locale={locale}
                suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
                materials={materials.map((m) => ({ id: m.id, name: m.name }))}
                initialSupplierId={supplierId}
            />
        </div>
    );
}
