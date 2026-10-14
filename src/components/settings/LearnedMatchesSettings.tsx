"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteCustomerAlias, deleteProductAlias } from "@/actions/learned-matches";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

export interface CustomerAliasRow {
    id: string;
    printedName: string;
    customerName: string;
    timesConfirmed: number;
}

export interface ProductAliasRow {
    id: string;
    customerName: string;
    printedText: string;
    productCode: string;
    productName: string;
    timesConfirmed: number;
}

/** What the app remembered from confirmed PO readings, with a way to forget a wrong match. */
export default function LearnedMatchesSettings({ customers, products }: { customers: CustomerAliasRow[]; products: ProductAliasRow[] }) {
    const t = useTranslations("settings.learned");
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const forget = async (id: string, action: (id: string) => Promise<{ success: boolean; error?: string }>) => {
        setBusy(id);
        setError(null);
        const result = await action(id);
        setBusy(null);
        if (!result.success) setError(result.error ?? t("error"));
        else router.refresh();
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)] px-5 py-4">
                <CardTitle>{t("title")}</CardTitle>
                <p className="text-[13px] text-[var(--color-text-secondary)]">{t("description")}</p>
            </CardHeader>
            <CardContent className="p-0">
                {error && <p role="alert" className="px-5 pt-4 text-sm text-[var(--color-error)]">{error}</p>}

                {customers.length === 0 && products.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">{t("empty")}</p>
                ) : (
                    <>
                        {customers.length > 0 && (
                            <section aria-label={t("customersTitle")}>
                                <h3 className="px-5 pb-2 pt-4 text-sm font-semibold text-[var(--color-text-primary)]">{t("customersTitle")}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("printedName")}</TableHead>
                                            <TableHead>{t("customer")}</TableHead>
                                            <TableHead className="text-end">{t("times")}</TableHead>
                                            <TableHead className="w-24"><span className="sr-only">{t("forget")}</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium">{row.printedName}</TableCell>
                                                <TableCell>{row.customerName}</TableCell>
                                                <TableCell className="text-end">{row.timesConfirmed}</TableCell>
                                                <TableCell className="text-end">
                                                    <Button size="sm" variant="ghost" isLoading={busy === row.id} disabled={busy !== null} onClick={() => forget(row.id, deleteCustomerAlias)}>
                                                        {t("forget")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </section>
                        )}

                        {products.length > 0 && (
                            <section aria-label={t("productsTitle")}>
                                <h3 className="px-5 pb-2 pt-4 text-sm font-semibold text-[var(--color-text-primary)]">{t("productsTitle")}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("customer")}</TableHead>
                                            <TableHead>{t("printedText")}</TableHead>
                                            <TableHead>{t("product")}</TableHead>
                                            <TableHead className="text-end">{t("times")}</TableHead>
                                            <TableHead className="w-24"><span className="sr-only">{t("forget")}</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.customerName}</TableCell>
                                                <TableCell className="font-medium">{row.printedText}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">{row.productCode}</span> {row.productName}
                                                </TableCell>
                                                <TableCell className="text-end">{row.timesConfirmed}</TableCell>
                                                <TableCell className="text-end">
                                                    <Button size="sm" variant="ghost" isLoading={busy === row.id} disabled={busy !== null} onClick={() => forget(row.id, deleteProductAlias)}>
                                                        {t("forget")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </section>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
