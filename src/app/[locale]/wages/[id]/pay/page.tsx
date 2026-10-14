import { getWorkerById } from "@/actions/wage";
import WageEntryForm from "@/components/wages/WageEntryForm";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string; id: string }>;
}

export default async function RecordWageEntryPage({ params }: PageProps) {
    const { id } = await params;
    const t = await getTranslations("wages.entry");

    const { success, data: worker } = await getWorkerById(id);

    if (!success || !worker) {
        notFound();
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                    {t("recordTitle")}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {t("recordSubtitle")}
                </p>
            </div>
            <WageEntryForm workerId={worker.id} workerName={worker.name} />
        </div>
    );
}
