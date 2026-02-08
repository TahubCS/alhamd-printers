
import { getCustomerPOById } from "@/actions/po";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailsPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");
    const t = await getTranslations("nav");

    const { success, data: po } = await getCustomerPOById(id);

    if (!success || !po) {
        notFound();
    }

    const isUrdu = locale === 'ur';

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
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-4" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/purchase-orders`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                            PO # {po.poNumber}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {formatDate(po.date)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {po.status === 'OPEN' ? (
                        <Link href={`/${locale}/invoices/new?fromPoId=${po.id}`}>
                            <Button>
                                Convert to Invoice
                            </Button>
                        </Link>
                    ) : (
                        <Badge variant="success" className="text-lg px-4 py-2">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {po.status}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Items</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(Number(item.rate))}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <div className="p-4 border-t flex justify-end">
                            <div className="text-lg font-bold">
                                Total: {formatCurrency(Number(po.totalAmount))}
                            </div>
                        </div>
                    </Card>

                    {/* Linked Invoices */}
                    {po.invoices && po.invoices.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Linked Invoices</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {po.invoices.map((inv: any) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">#{inv.invoiceNo}</TableCell>
                                                <TableCell>{formatDate(inv.date)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(Number(inv.total))}</TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/${locale}/invoices/${inv.id}`}>
                                                        <Button size="sm" variant="ghost">View</Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Customer Info */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Name</div>
                                <div className="text-lg font-bold text-[var(--color-primary)]">
                                    <Link href={`/${locale}/customers/${po.customerId}`} className="hover:underline">
                                        {po.customer?.name}
                                    </Link>
                                </div>
                                <div className="text-md text-muted-foreground">{po.customer?.nameUrdu}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Original PO File</div>
                                {po.originalFileUrl ? (
                                    <div className="mt-2 text-sm text-blue-600 underline cursor-pointer">
                                        View File (Not implemented yet)
                                    </div>
                                ) : (
                                    <div className="mt-1 text-sm text-muted-foreground italic">No file attached</div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Status</div>
                                <div className="mt-1">
                                    <Badge variant={po.status === 'CLOSED' ? 'success' : 'default'}>
                                        {po.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
