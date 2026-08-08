"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createWorker } from "@/actions/wage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function WorkerForm() {
    const t = useTranslations("wages.form");
    const tActions = useTranslations("actions");
    const router = useRouter();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert(t("nameRequired"));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createWorker({
                name: name.trim(),
                phone: phone.trim() || undefined,
            });

            if (result.success) {
                router.push("/wages");
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to add worker");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <Label>{t("name")}</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            required
                        />
                    </div>
                    <div>
                        <Label>{t("phone")}</Label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t("phonePlaceholder")}
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
