import { getTranslations } from "next-intl/server";
import { getCustomers } from "@/actions/customer";
import PageHeader from "@/components/layout/PageHeader";
import POUploadForm from "@/components/po/POUploadForm";

export const dynamic = "force-dynamic";

export default async function NewPOPage() {
    const t = await getTranslations("orders.upload");
    const { data: customers = [] } = await getCustomers();

    return (
        <div className="animate-fade-in p-3 rtl:p-4">
            <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
            <POUploadForm
                customers={customers.map((c) => ({ id: c.id, name: c.name, nameUrdu: c.nameUrdu }))}
                aiEnabled={Boolean(process.env.GOOGLE_GEMINI_API_KEY)}
            />
        </div>
    );
}
