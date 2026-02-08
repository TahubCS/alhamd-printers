import { getCustomerById, getCustomerLedger } from "@/actions/customer";
import { getCustomerPOs } from "@/actions/po";
import CustomerContent from "@/components/customers/CustomerContent";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerDetailsPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const t = await getTranslations("customers");
    const tActions = await getTranslations("actions");

    const [customerResult, ledgerResult, poResult] = await Promise.all([
        getCustomerById(id),
        getCustomerLedger(id),
        getCustomerPOs(id),
    ]);

    if (!customerResult.success || !customerResult.data) {
        notFound();
    }

    const customer = customerResult.data;
    const ledger = ledgerResult.data || [];
    const purchaseOrders = poResult.data || [];

    const isUrdu = locale === 'ur';

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
                        {customer.name}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: isUrdu ? '1.2rem' : '1.1rem',
                            lineHeight: isUrdu ? '1.8' : '1.5'
                        }}
                    >
                        {customer.nameUrdu}
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link href={`/${locale}/customers/${id}/edit`}>
                        <Button variant="outline" className="w-full sm:w-auto">{tActions("edit")}</Button>
                    </Link>
                    <Link href={`/${locale}/invoices/new?customerId=${id}`}>
                        <Button variant="primary" className="w-full sm:w-auto">{tActions("newInvoice")}</Button>
                    </Link>
                    <Button variant="secondary" className="w-full sm:w-auto">{tActions("recordPayment")}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: isUrdu ? '24px' : '20px' }}>
                <Card className="card md:col-span-1" style={{ padding: isUrdu ? '28px' : '24px' }}>
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-xl text-[var(--color-text-primary)]">{t("personalInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("phone")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.phone || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("email")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.email || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("address")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.address || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("status")}
                            </div>
                            <div className="mt-1">
                                {customer.isBadDebt ? (
                                    <Badge variant="danger">{t("badDebt")}</Badge>
                                ) : (
                                    <Badge variant="success">{t("good")}</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2">
                    <CustomerContent
                        ledger={ledger}
                        purchaseOrders={purchaseOrders}
                        locale={locale}
                        customerId={id}
                    />
                </div>
            </div>
        </div>
    );
}
