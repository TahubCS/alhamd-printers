import WorkerForm from "@/components/wages/WorkerForm";
import { getTranslations } from "next-intl/server";

export default async function NewWorkerPage() {
    const t = await getTranslations("wages.form");

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    {t("createTitle")}
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-2">
                    {t("createSubtitle")}
                </p>
            </div>
            <WorkerForm />
        </div>
    );
}
