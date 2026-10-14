import ExpenseForm from "@/components/expenses/ExpenseForm";
import { getTranslations } from "next-intl/server";

export default async function NewExpensePage() {
    const t = await getTranslations("expenses.form");

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                    {t("createTitle")}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {t("createSubtitle")}
                </p>
            </div>
            <ExpenseForm />
        </div>
    );
}
