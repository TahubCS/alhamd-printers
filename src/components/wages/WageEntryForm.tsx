"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createWageEntry } from "@/actions/wage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface WageEntryFormProps {
    workerId: string;
    workerName: string;
}

export default function WageEntryForm({ workerId, workerName }: WageEntryFormProps) {
    const t = useTranslations("wages.entry");
    const tActions = useTranslations("actions");
    const router = useRouter();

    const [type, setType] = useState<"PAYMENT" | "ADVANCE" | "DEDUCTION" | "ADJUSTMENT">("PAYMENT");
    const [amount, setAmount] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert(t("amountRequired"));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createWageEntry({
                workerId,
                type,
                amount,
                date: new Date(date),
                description: description.trim() || undefined,
            });

            if (result.success) {
                router.push(`/wages/${workerId}`);
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to record entry");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)]">
                        <p className="text-sm text-[var(--color-text-secondary)]">{t("worker")}</p>
                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">{workerName}</p>
                    </div>

                    <div>
                        <Label>{t("type")}</Label>
                        <select
                            style={{
                                width: "100%",
                                height: "44px",
                                padding: "8px 14px",
                                borderRadius: "12px",
                                fontSize: "14px",
                                background: "var(--color-bg-tertiary)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                appearance: "auto",
                            }}
                            value={type}
                            onChange={(e) => setType(e.target.value as typeof type)}
                        >
                            <option value="PAYMENT">{t("wagePayment")}</option>
                            <option value="ADVANCE">{t("advance")}</option>
                            <option value="DEDUCTION">{t("deduction")}</option>
                            <option value="ADJUSTMENT">{t("adjustment")}</option>
                        </select>
                    </div>

                    <div>
                        <Label>{t("amount")} (PKR)</Label>
                        <Input
                            type="number"
                            value={amount || ""}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            placeholder="0"
                            min="0"
                            step="1"
                            required
                        />
                        {type === "ADVANCE" && (
                            <p className="mt-1 text-xs text-red-500">{t("advanceNote")}</p>
                        )}
                        {type === "PAYMENT" && (
                            <p className="mt-1 text-xs text-green-500">{t("paymentNote")}</p>
                        )}
                    </div>

                    <div>
                        <Label>{t("date")}</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <Label>{t("description")}</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("descriptionPlaceholder")}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    {tActions("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "..." : tActions("save")}
                </Button>
            </div>
        </form>
    );
}
