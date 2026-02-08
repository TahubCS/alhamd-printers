import { getCustomerById, getCustomerLedger } from "@/actions/customer";
import { getCustomerPOs } from "@/actions/po";
import CustomerContent from "@/components/customers/CustomerContent";
import CustomerActions from "@/components/customers/CustomerActions";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";
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
                <CustomerActions
                    customerId={id}
                    customerName={customer.name}
                    customerBalance={Number(customer.balance)}
                    locale={locale}
                    labels={{
                        edit: tActions("edit"),
                        newInvoice: tActions("newInvoice"),
                        recordPayment: tActions("recordPayment"),
                    }}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: isUrdu ? '24px' : '20px' }}>
                <Card className="md:col-span-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] p-6">
                    <CardHeader className="p-0 pb-5 mb-6 border-b border-[var(--color-border)]">
                        <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Contact Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {/* Balance Highlight */}
                        <div className="p-5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                            <div className="text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
                                Outstanding Balance
                            </div>
                            <div className={`text-3xl font-bold tracking-tight ${Number(customer.balance) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                    style: "currency",
                                    currency: "PKR",
                                }).format(Number(customer.balance))}
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)]">
                                <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-widest" style={{ marginBottom: '8px' }}>
                                    {t("phone")}
                                </div>
                                <div className="text-base text-[var(--color-text-primary)] font-medium" style={{ lineHeight: '2.2' }}>
                                    {customer.phone || "—"}
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)]">
                                <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-widest" style={{ marginBottom: '8px' }}>
                                    {t("email")}
                                </div>
                                <div className="text-base text-[var(--color-text-primary)] font-medium break-all" style={{ lineHeight: '2.2' }}>
                                    {customer.email || "—"}
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)]">
                                <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-widest" style={{ marginBottom: '8px' }}>
                                    {t("address")}
                                </div>
                                <div className="text-base text-[var(--color-text-primary)] font-medium" style={{ lineHeight: '2.2' }}>
                                    {customer.address || "—"}
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="pt-5 mt-2 border-t border-[var(--color-border)]">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-widest">
                                    {t("status")}
                                </span>
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
