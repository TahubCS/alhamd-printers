
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
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
        <Tabs className="w-full" >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger
                    value="ledger"
                    activeValue={activeTab}
                    setActiveValue={setActiveTab}
                >
                    Ledger
                </TabsTrigger>
                <TabsTrigger
                    value="po"
                    activeValue={activeTab}
                    setActiveValue={setActiveTab}
                >
                    Purchase Orders
                </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" activeValue={activeTab}>
                <Card className="card p-6">
                    <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl text-[var(--color-text-primary)]">Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Particulars</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledger.length > 0 ? (
                                    ledger.map((entry: any) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">
                                                {formatDate(entry.date)}
                                            </TableCell>
                                            <TableCell className="text-[var(--color-text-primary)]">
                                                {entry.particulars}
                                                {entry.invoice?.invoiceNo && ` #${entry.invoice.invoiceNo}`}
                                                {entry.payment?.method && ` (${entry.payment.method})`}
                                            </TableCell>
                                            <TableCell className="text-right text-[var(--color-text-primary)]">
                                                {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit)) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right text-[var(--color-text-primary)]">
                                                {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit)) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-[var(--color-text-primary)]">
                                                {formatCurrency(Number(entry.balance))}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="po" activeValue={activeTab}>
                <Card className="card p-6">
                    <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl text-[var(--color-text-primary)]">Purchase Orders</CardTitle>
                        <Link href={`/${locale}/purchase-orders/new`}>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" /> Upload PO
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO Date</TableHead>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseOrders.length > 0 ? (
                                    purchaseOrders.map((po: any) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">
                                                {formatDate(po.date)}
                                            </TableCell>
                                            <TableCell className="font-medium text-[var(--color-text-primary)]">
                                                {po.poNumber}
                                            </TableCell>
                                            <TableCell className="text-right text-[var(--color-text-primary)]">
                                                {formatCurrency(Number(po.totalAmount))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {po._count?.items || 0}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${po.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                                        po.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {po.status === 'OPEN' && (
                                                    <Link href={`/${locale}/invoices/new?fromPoId=${po.id}`}>
                                                        <Button size="sm" variant="outline" className="h-8">
                                                            Convert to Invoice
                                                        </Button>
                                                    </Link>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No purchase orders found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
