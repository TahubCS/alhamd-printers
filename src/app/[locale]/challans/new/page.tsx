import { getTranslations } from "next-intl/server";
import { getCustomers } from "@/actions/customer";
import { getAllPOs } from "@/actions/po";
import PageHeader from "@/components/layout/PageHeader";
import ChallanForm from "@/components/challans/ChallanForm";

export const dynamic = "force-dynamic";

export default async function NewChallanPage({ searchParams }: { searchParams: Promise<{ fromPoId?: string }> }) {
    const { fromPoId } = await searchParams;
    const t = await getTranslations("challans");
    const [{ data: customers = [] }, { data: pos = [] }] = await Promise.all([getCustomers(), getAllPOs()]);

    return (
        <div className="mx-auto max-w-4xl animate-fade-in">
            <PageHeader title={t("newChallan")} subtitle={t("formSubtitle")} />
            <ChallanForm
                customers={customers.map((c) => ({ id: c.id, name: c.name, nameUrdu: c.nameUrdu }))}
                purchaseOrders={pos
                    .filter((po) => po.customerId && po.status !== "REJECTED" && po.status !== "DRAFT")
                    .map((po) => ({ id: po.id, poNumber: po.poNumber, customerId: po.customerId!, date: po.date }))}
                initialPoId={fromPoId}
            />
        </div>
    );
}
