
import { getAllPOs } from "@/actions/po";
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
import { Plus, Eye, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations("nav"); // Using nav translations for title for now, or add specific PO translations
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");

    const { success, data: purchaseOrders } = await getAllPOs();

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <div>
                    <h1
                        className="font-bold text-[var(--color-text-primary)]"
                        style={{
                            fontSize: isUrdu ? '2.5rem' : '2rem',
                            marginBottom: isUrdu ? '16px' : '12px',
                            lineHeight: isUrdu ? '1.4' : '1.2'
                        }}
                    >
                        {t('orders')}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: isUrdu ? '1.2rem' : '1.1rem',
                            lineHeight: isUrdu ? '1.8' : '1.5'
                        }}
                    >
                        Manage incoming purchase orders
                    </p>
                </div>
                <Link href={`/${locale}/purchase-orders/new`}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        {tActions('newInvoice').replace("Invoice", "Order")} {/* Quick fix for label */}
                    </Button>
                </Link>
            </div>

            <Card className="card">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders && purchaseOrders.length > 0 ? (
                                purchaseOrders.map((po: any) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="text-[var(--color-text-secondary)]">
                                            {formatDate(po.date)}
                                        </TableCell>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">
                                            {po.poNumber}
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/${locale}/customers/${po.customerId}`} className="hover:underline text-primary">
                                                {po.customer?.name}
                                                {po.customer?.nameUrdu && <span className="ml-1 text-xs text-muted-foreground">({po.customer.nameUrdu})</span>}
                                            </Link>
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
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/${locale}/purchase-orders/${po.id}`}>
                                                    <Button size="sm" variant="ghost">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                {po.status === 'OPEN' && (
                                                    <Link href={`/${locale}/invoices/new?fromPoId=${po.id}`}>
                                                        <Button size="sm" variant="outline" className="h-8">
                                                            Convert
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No purchase orders found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
