import { getTranslations } from "next-intl/server";
import { getCustomers } from "@/actions/customer";
import PageHeader from "@/components/layout/PageHeader";
import POUploadForm from "@/components/po/POUploadForm";
import { isAiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPOPage() {
    const t = await getTranslations("orders.upload");
    const [{ data: customers = [] }, products] = await Promise.all([
        getCustomers(),
        prisma.product.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    ]);

    return (
        <div className="animate-fade-in">
            <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
            <POUploadForm
                customers={customers.map((c) => ({ id: c.id, name: c.name, nameUrdu: c.nameUrdu }))}
                products={products}
                aiEnabled={isAiConfigured()}
            />
        </div>
    );
}
