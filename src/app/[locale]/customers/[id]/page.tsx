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

    const balance = Number(customer.balance);

    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                        {customer.name}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                    <CustomerContent
                        ledger={ledger}
                        purchaseOrders={purchaseOrders}
                        locale={locale}
                    />
                </div>

                <Card className="self-start overflow-hidden">
                    <div className="border-b border-[var(--color-border)] px-5 py-4">
                        <p className="text-[13px] text-[var(--color-text-secondary)]">{t("outstanding")}</p>
                        <p className={`mt-0.5 text-2xl font-semibold leading-8 tabular-nums ${balance > 0 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>
                            {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                style: "currency",
                                currency: "PKR",
                            }).format(balance)}
                        </p>
                    </div>
                    <CardHeader className="px-5 pb-2 pt-4">
                        <CardTitle className="text-sm">{t("contactInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <dl className="divide-y divide-[var(--color-divider)] text-sm">
                            <div className="flex items-start justify-between gap-4 py-2.5">
                                <dt className="text-[var(--color-text-secondary)]">{t("phone")}</dt>
                                <dd className="text-end font-medium text-[var(--color-text-primary)]" dir="ltr">{customer.phone || "—"}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-4 py-2.5">
                                <dt className="text-[var(--color-text-secondary)]">{t("email")}</dt>
                                <dd className="min-w-0 break-all text-end font-medium text-[var(--color-text-primary)]" dir="ltr">{customer.email || "—"}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-4 py-2.5">
                                <dt className="text-[var(--color-text-secondary)]">{t("address")}</dt>
                                <dd className="text-end font-medium text-[var(--color-text-primary)]">{customer.address || "—"}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-2.5">
                                <dt className="text-[var(--color-text-secondary)]">{t("status")}</dt>
                                <dd>
                                    {customer.isBadDebt ? (
                                        <Badge variant="danger">{t("badDebt")}</Badge>
                                    ) : (
                                        <Badge variant="success">{t("good")}</Badge>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
