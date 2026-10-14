import { getRawMaterials } from "@/actions/inventory";
import { getTranslations } from "next-intl/server";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";
import PageHeader from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
    const t = await getTranslations("inventory");

    const { data: materials } = await getRawMaterials();

    return (
        <div className="animate-fade-in p-3 rtl:p-4">
            <PageHeader title={t("title")} subtitle={t("subtitle")} />
            <InventoryDashboard initialMaterials={materials || []} />
        </div>
    );
}
