"use client";

import { createCustomer, updateCustomer } from "@/actions/customer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CustomerFormValues, CustomerSchema } from "@/lib/validations/customer";
import { zodResolver } from "@hookform/resolvers/zod";
import { Customer } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface CustomerFormProps {
    customer?: Customer;
    mode: "create" | "edit";
    locale: string;
}

export function CustomerForm({ customer, mode, locale }: CustomerFormProps) {
    const t = useTranslations("customers");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(CustomerSchema) as any,
        defaultValues: {
            name: customer?.name || "",
            nameUrdu: customer?.nameUrdu || "",
            phone: customer?.phone || "",
            address: customer?.address || "",
            email: customer?.email || "",
            creditLimit: customer?.creditLimit ? Number(customer.creditLimit) : undefined,
            isBadDebt: customer?.isBadDebt ?? false,
            openingBalance: 0, // Only used for create mode logic physically
        },
    });

    const onSubmit = async (data: CustomerFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            if (mode === "create") {
                const result = await createCustomer(data);
                if (!result.success) {
                    setError(result.error as string);
                    return;
                }
            } else {
                if (!customer) return;
                const result = await updateCustomer(customer.id, data);
                if (!result.success) {
                    setError(result.error as string);
                    return;
                }
            }

            router.push(`/${locale}/customers`);
            router.refresh();
        } catch (e) {
            console.error(e);
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg text-[var(--color-text-primary)]">{t("personalInfo")}</h3>

                            <Input
                                label={t("name")}
                                {...form.register("name")}
                                error={form.formState.errors.name?.message}
                                dir="ltr"
                            />

                            <Input
                                label={t("nameUrdu")}
                                {...form.register("nameUrdu")}
                                error={form.formState.errors.nameUrdu?.message}
                                className="font-noto-nastaliq text-right"
                                dir="rtl"
                                placeholder="اردو نام"
                            />

                            <Input
                                label={t("phone")}
                                {...form.register("phone")}
                                error={form.formState.errors.phone?.message}
                                dir="ltr"
                            />

                            <Input
                                label={t("email")}
                                type="email"
                                {...form.register("email")}
                                error={form.formState.errors.email?.message}
                                dir="ltr"
                            />

                            <Input
                                label={t("address")}
                                {...form.register("address")}
                                error={form.formState.errors.address?.message}
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-lg text-[var(--color-text-primary)]">{t("financialInfo")}</h3>

                            <Input
                                label={t("creditLimit")}
                                type="number"
                                {...form.register("creditLimit")}
                                error={form.formState.errors.creditLimit?.message}
                                dir="ltr"
                            />

                            {mode === "create" && (
                                <Input
                                    label={t("openingBalance")}
                                    type="number"
                                    {...form.register("openingBalance")}
                                    error={form.formState.errors.openingBalance?.message}
                                    dir="ltr"
                                    placeholder="0.00"
                                />
                            )}

                            <div className="flex items-center space-x-2 pt-4">
                                <input
                                    type="checkbox"
                                    id="isBadDebt"
                                    {...form.register("isBadDebt")}
                                    className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                                />
                                <label htmlFor="isBadDebt" className="text-sm font-medium leading-none text-[var(--color-text-secondary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {t("badDebt")}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={isLoading}
                        >
                            {tActions("cancel")}
                        </Button>
                        <Button type="submit" isLoading={isLoading}>
                            {tActions("save")}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
