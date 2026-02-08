
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Plus, FileText, CreditCard } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface CustomerContentProps {
    ledger: any[];
    purchaseOrders: any[];
    locale: string;
    customerId: string;
}

export default function CustomerContent({ ledger, purchaseOrders, locale, customerId }: CustomerContentProps) {
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
                    Ledger
                </TabsTrigger>
                <TabsTrigger
                    value="po"
                    activeValue={activeTab}
                    setActiveValue={setActiveTab}
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Purchase Orders
                </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" activeValue={activeTab}>
                <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg text-[var(--color-text-primary)]">
                            Transaction History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-[var(--color-border)] hover:bg-transparent">
                                        <TableHead className="text-[var(--color-text-secondary)]">Date</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">Particulars</TableHead>
                                        <TableHead className="text-right text-[var(--color-text-secondary)]">Debit</TableHead>
                                        <TableHead className="text-right text-[var(--color-text-secondary)]">Credit</TableHead>
                                        <TableHead className="text-right text-[var(--color-text-secondary)]">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.length > 0 ? (
                                        ledger.map((entry: any) => (
                                            <TableRow key={entry.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)]">
                                                <TableCell className="text-[var(--color-text-tertiary)]">
                                                    {formatDate(entry.date)}
                                                </TableCell>
                                                <TableCell className="text-[var(--color-text-primary)]">
                                                    {entry.particulars}
                                                    {entry.invoice?.invoiceNo && ` #${entry.invoice.invoiceNo}`}
                                                    {entry.payment?.method && ` (${entry.payment.method})`}
                                                </TableCell>
                                                <TableCell className="text-right text-red-400">
                                                    {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit)) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-green-400">
                                                    {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit)) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-[var(--color-text-primary)]">
                                                    {formatCurrency(Number(entry.balance))}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-[var(--color-text-tertiary)]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <CreditCard className="w-8 h-8 opacity-50" />
                                                    <span>No transactions found</span>
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
                        <CardTitle className="text-lg text-[var(--color-text-primary)]">
                            Purchase Orders
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
                                        <TableHead className="text-[var(--color-text-secondary)]">Date</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">PO Number</TableHead>
                                        <TableHead className="text-right text-[var(--color-text-secondary)]">Amount</TableHead>
                                        <TableHead className="text-center text-[var(--color-text-secondary)]">Items</TableHead>
                                        <TableHead className="text-[var(--color-text-secondary)]">Status</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrders.length > 0 ? (
                                        purchaseOrders.map((po: any) => (
                                            <TableRow key={po.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)]">
                                                <TableCell className="text-[var(--color-text-tertiary)]">
                                                    {formatDate(po.date)}
                                                </TableCell>
                                                <TableCell className="font-medium text-[var(--color-text-primary)]">
                                                    {po.poNumber || "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-[var(--color-text-primary)]">
                                                    {formatCurrency(Number(po.totalAmount))}
                                                </TableCell>
                                                <TableCell className="text-center text-[var(--color-text-secondary)]">
                                                    {po._count?.items || 0}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${po.status === 'OPEN'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : po.status === 'CLOSED'
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : po.status === 'PARTIAL'
                                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                                                        }`}>
                                                        {po.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {po.status === 'OPEN' && (
                                                        <Link href={`/${locale}/invoices/new?fromPoId=${po.id}`}>
                                                            <Button size="sm" variant="outline" className="h-8 text-xs">
                                                                Convert to Invoice
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
                                                    <span>No purchase orders found</span>
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
