import { getRawMaterials } from "@/actions/inventory";
import { getTranslations } from "next-intl/server";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("inventory");

    const { success, data: materials } = await getRawMaterials();

    if (!success) {
        // Handle error better in real app
        console.error("Failed to fetch inventory");
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                        {t("title")}
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">
                        {t("subtitle")}
                    </p>
                </div>
            </div>

            <InventoryDashboard
                initialMaterials={materials || []}
                locale={locale}
            />
        </div>
    );
}
