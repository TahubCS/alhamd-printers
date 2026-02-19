"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createExpense, scanReceipt } from "@/actions/expense";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Upload, Sparkles, Loader2 } from "lucide-react";

export default function ExpenseForm() {
    const t = useTranslations("expenses.form");
    const tActions = useTranslations("actions");
    const router = useRouter();

    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{
        confidence: number;
        description: string;
        amount: number;
    } | null>(null);

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await scanReceipt(formData);

            if (result.success && result.data) {
                setDescription(result.data.description);
                setAmount(result.data.amount);
                if (result.data.date) {
                    setDate(result.data.date);
                }
                setScanResult({
                    confidence: result.data.confidence,
                    description: result.data.description,
                    amount: result.data.amount,
                });
            } else {
                alert(result.error || "Failed to scan receipt");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to scan receipt");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            alert(t("descriptionRequired"));
            return;
        }
        if (amount <= 0) {
            alert(t("amountRequired"));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createExpense({
                date: new Date(date),
                description: description.trim(),
                amount,
            });

            if (result.success) {
                router.push("/expenses");
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to create expense");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confidenceColor =
        scanResult && scanResult.confidence >= 0.8
            ? "text-green-500"
            : scanResult && scanResult.confidence >= 0.5
                ? "text-yellow-500"
                : "text-red-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI Receipt Scanner */}
            <Card className="border-dashed border-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5">
                <CardContent className="p-6">
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-[var(--color-primary)]">
                            <Sparkles className="w-5 h-5" />
                            <h3 className="text-lg font-semibold">{t("scanReceipt")}</h3>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            {t("scanDescription")}
                        </p>

                        <label className="inline-flex items-center gap-2 px-6 py-3 rounded-lg cursor-pointer bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t("scanning")}
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    {t("uploadReceipt")}
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleScan}
                                disabled={isScanning}
                                className="hidden"
                            />
                        </label>

                        {scanResult && (
                            <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg-secondary)] text-left text-sm">
                                <p className="text-[var(--color-text-secondary)]">
                                    AI Confidence:{" "}
                                    <span className={`font-bold ${confidenceColor}`}>
                                        {Math.round(scanResult.confidence * 100)}%
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Manual / Filled Fields */}
            <Card>
                <CardContent className="p-6 space-y-4">
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
                            required
                        />
                    </div>

                    <div>
                        <Label>{t("amount")} (PKR)</Label>
                        <Input
                            type="number"
                            value={amount || ""}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    {tActions("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : tActions("save")}
                </Button>
            </div>
        </form>
    );
}
