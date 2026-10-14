"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import POStatusBadge from "@/components/po/POStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Plus, FileText, CreditCard } from "lucide-react";
import Link from "next/link";
import type { getCustomerLedger } from "@/actions/customer";
import type { getCustomerPOs } from "@/actions/po";

type LedgerRow = NonNullable<Awaited<ReturnType<typeof getCustomerLedger>>["data"]>[number];
type CustomerPORow = NonNullable<Awaited<ReturnType<typeof getCustomerPOs>>["data"]>[number];

interface CustomerContentProps {
    ledger: LedgerRow[];
    purchaseOrders: CustomerPORow[];
    locale: string;
}

export default function CustomerContent({ ledger, purchaseOrders, locale }: CustomerContentProps) {
    const [activeTab, setActiveTab] = useState("ledger");
    const t = useTranslations("customers");

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
            style: "currency",
            currency: "PKR",
        }).format(amount);
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString(locale === "ur" ? "ur-PK" : "en-PK");
    };

    return (
        <Tabs className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                    value="ledger"
                    activeValue={activeTab}
                    setActiveValue={setActiveTab}
                >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("ledgerTab")}
                </TabsTrigger>
                <TabsTrigger
                    value="po"
                    activeValue={activeTab}
                    setActiveValue={setActiveTab}
                >
                    <FileText className="w-4 h-4 mr-2" />
                    {t("ordersTab")}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" activeValue={activeTab}>
                <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-[var(--color-text-primary)]">
                            {t("history")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-[var(--color-border)] hover:bg-transparent">
                                        <TableHead className="text-[var(--color-text-secondary)]">{t("date")}</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">{t("particulars")}</TableHead>
                                        <TableHead className="text-end text-[var(--color-text-secondary)]">{t("debit")}</TableHead>
                                        <TableHead className="text-end text-[var(--color-text-secondary)]">{t("credit")}</TableHead>
                                        <TableHead className="text-end text-[var(--color-text-secondary)]">{t("balance")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.length > 0 ? (
                                        ledger.map((entry) => (
                                            <TableRow key={entry.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)]">
                                                <TableCell className="text-[var(--color-text-tertiary)]">
                                                    {formatDate(entry.date)}
                                                </TableCell>
                                                <TableCell className="text-[var(--color-text-primary)]">
                                                    {entry.particulars}
                                                    {entry.payment?.method && ` (${entry.payment.method})`}
                                                </TableCell>
                                                <TableCell className="text-end text-[var(--color-error)]">
                                                    {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit)) : "-"}
                                                </TableCell>
                                                <TableCell className="text-end text-[var(--color-success)]">
                                                    {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit)) : "-"}
                                                </TableCell>
                                                <TableCell className="text-end font-semibold text-[var(--color-text-primary)]">
                                                    {formatCurrency(Number(entry.balance))}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-[var(--color-text-tertiary)]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <CreditCard className="w-8 h-8 opacity-50" />
                                                    <span>{t("noTransactions")}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="po" activeValue={activeTab}>
                <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-[var(--color-text-primary)]">
                            {t("ordersTab")}
                        </CardTitle>
                        <Link href={`/${locale}/purchase-orders/new`}>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" /> Upload PO
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-[var(--color-border)] hover:bg-transparent">
                                        <TableHead className="text-[var(--color-text-secondary)]">{t("date")}</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">{t("poNumber")}</TableHead>
                                        <TableHead className="text-end text-[var(--color-text-secondary)]">{t("amount")}</TableHead>
                                        <TableHead className="text-center text-[var(--color-text-secondary)]">{t("items")}</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">{t("status")}</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrders.length > 0 ? (
                                        purchaseOrders.map((po) => (
                                            <TableRow key={po.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)]">
                                                <TableCell className="text-[var(--color-text-tertiary)]">
                                                    {formatDate(po.date)}
                                                </TableCell>
                                                <TableCell className="font-medium text-[var(--color-text-primary)]">
                                                    {po.poNumber || "-"}
                                                </TableCell>
                                                <TableCell className="text-end text-[var(--color-text-primary)]">
                                                    {formatCurrency(Number(po.totalAmount))}
                                                </TableCell>
                                                <TableCell className="text-center text-[var(--color-text-secondary)]">
                                                    {po._count?.items || 0}
                                                </TableCell>
                                                <TableCell>
                                                    <POStatusBadge status={po.status} />
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    {(po.status === 'OPEN' || po.status === 'PARTIAL') && (
                                                        <Link href={`/${locale}/invoices/new?fromPoId=${po.id}`}>
                                                            <Button size="sm" variant="outline" className="h-8 text-xs">
                                                                {t("convert")}
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-[var(--color-text-tertiary)]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-8 h-8 opacity-50" />
                                                    <span>{t("noOrders")}</span>
                                                    <Link href={`/${locale}/purchase-orders/new`}>
                                                        <Button size="sm" variant="outline" className="mt-2">
                                                            <Plus className="w-4 h-4 mr-2" /> Upload First PO
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
