import { getInvoiceById } from "@/actions/invoice";
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
import { Printer, ArrowLeft } from "lucide-react";
import PrintButton from "@/components/invoices/PrintButton";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string; locale: string }>;
}

export default async function InvoiceDetailsPage({ params }: PageProps) {
    const { id, locale } = await params;
    const t = await getTranslations("invoices.details");
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");

    const { success, data: invoice, error } = await getInvoiceById(id);

    if (!success || !invoice) {
        notFound();
    }

    const isUrdu = locale === 'ur';

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            {/* Action Bar (Hidden in Print) */}
            <div className="flex items-center justify-between print:hidden" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <Link href={`/${locale}/invoices`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {tActions("view")}
                    </Button>
                </Link>
                <PrintButton />
            </div>

            <div className="card print:p-0 print:border-0 print:shadow-none print:w-full print:bg-white print:text-black" style={{ padding: isUrdu ? '28px' : '24px' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-[var(--color-border)] pb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] print:text-black">{invoice.company.name}</h1>
                        <p className="text-sm text-[var(--color-text-secondary)] font-noto-nastaliq mt-1 print:text-gray-600">
                            {invoice.company.nameUrdu}
                        </p>
                        <p className="text-sm mt-2 text-[var(--color-text-secondary)] print:text-gray-600">{invoice.company.address}</p>
                        <p className="text-sm text-[var(--color-text-secondary)] print:text-gray-600">{invoice.company.phone}</p>
                        <p className="text-sm text-[var(--color-text-secondary)] print:text-gray-600">{invoice.company.email}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] print:text-black">INVOICE</h2>
                        <p className="text-lg font-mono mt-2 text-[var(--color-text-primary)] print:text-black">#{invoice.invoiceNo}</p>

                        <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
                            <div className="flex justify-end gap-4">
                                <span className="text-muted-foreground">{t("date")}:</span>
                                <span className="font-medium text-[var(--color-text-primary)]">
                                    {new Date(invoice.date).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK')}
                                </span>
                            </div>
                            <div className="flex justify-end gap-4">
                                <span className="text-muted-foreground">{t("dueDate")}:</span>
                                <span className="font-medium text-[var(--color-text-primary)]">
                                    {new Date(invoice.dueDate).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                        {tCommon("billTo", { defaultMessage: "Bill To" })}
                    </h3>
                    <div className="font-medium text-lg text-[var(--color-text-primary)]">{invoice.customer.name}</div>
                    <div className="text-md font-noto-nastaliq text-[var(--color-text-secondary)]">{invoice.customer.nameUrdu}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                        {invoice.customer.address}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {invoice.customer.phone}
                    </div>
                </div>

                {/* Items Table */}
                <Table className="mb-8">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">{t("description")}</TableHead>
                            <TableHead className="text-right">{t("rate")}</TableHead>
                            <TableHead className="text-right">{t("quantity")}</TableHead>
                            <TableHead className="text-right text-[var(--color-text-secondary)]">GST %</TableHead>
                            <TableHead className="text-right">{t("total")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <span className="font-medium text-[var(--color-text-primary)]">{item.description}</span>
                                    {/* Display sizes if PVC bag */}
                                    {(item.sizeWidth || item.product) && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {item.product?.code}
                                            {item.sizeWidth ? ` (${item.sizeWidth}" x ${item.sizeLength}" / ${item.sizeDepth})` : ''}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right text-[var(--color-text-primary)]">
                                    {new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK').format(Number(item.rate))}
                                </TableCell>
                                <TableCell className="text-right text-[var(--color-text-primary)]">{item.quantity}</TableCell>
                                <TableCell className="text-right text-[var(--color-text-secondary)]">
                                    {Number(item.gstRate) > 0 ? `${Number(item.gstRate)}%` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-[var(--color-text-primary)]">
                                    {new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
                                        style: "currency",
                                        currency: "PKR"
                                    }).format(Number(item.amount))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Totals */}
                <div className="flex justify-end border-t pt-8">
                    <div className="w-[300px] space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("subtotal")}</span>
                            <span className="text-[var(--color-text-primary)]">
                                {new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
                                    style: "currency",
                                    currency: "PKR"
                                }).format(Number(invoice.subtotal))}
                            </span>
                        </div>
                        {Number(invoice.taxTotal) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">GST Total</span>
                                <span className="text-[var(--color-text-primary)]">
                                    {new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
                                        style: "currency",
                                        currency: "PKR"
                                    }).format(Number(invoice.taxTotal))}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 text-[var(--color-text-primary)]">
                            <span>{t("total")}</span>
                            <span>
                                {new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
                                    style: "currency",
                                    currency: "PKR"
                                }).format(Number(invoice.total))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mt-8 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-1 text-[var(--color-text-primary)]">Notes:</h4>
                        <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                    </div>
                )}

                {/* Footer Signature */}
                <div className="mt-16 flex justify-between text-sm pt-8 print:flex hidden">
                    <div className="border-t w-[200px] text-center pt-2">
                        Prepared By
                    </div>
                    <div className="border-t w-[200px] text-center pt-2">
                        Authorized Signature
                    </div>
                </div>
            </div>
        </div>
    );
}
