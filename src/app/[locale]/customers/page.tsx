import { getCustomers } from "@/actions/customer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const { q } = await searchParams;
    const t = await getTranslations("customers");
    const tActions = await getTranslations("actions");

    const { success, data: customers, error } = await getCustomers(q);

    if (!success || !customers) {
        // Handle error state properly in a real app
        console.error(error);
    }


    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {t("subtitle")}
                    </p>
                </div>
                <Link href={`/${locale}/customers/new`}>
                    <Button>
                        {t("newCustomer")}
                    </Button>
                </Link>
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="border-b border-[var(--color-border)] px-5 py-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-[var(--color-text-primary)]">{t("title")}</CardTitle>
                        <form className="flex w-full max-w-sm items-center space-x-2">
                            <Input
                                name="q"
                                placeholder={tActions("search")}
                                defaultValue={q}
                                className="h-10"
                            />
                            <Button type="submit" variant="secondary">
                                {tActions("search")}
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("name")}</TableHead>
                                <TableHead>{t("nameUrdu")}</TableHead>
                                <TableHead>{t("phone")}</TableHead>
                                <TableHead className="text-right">{t("balance")}</TableHead>
                                <TableHead>{t("status")}</TableHead>
                                <TableHead className="text-right">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers && customers.length > 0 ? (
                                customers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">{customer.name}</TableCell>
                                        <TableCell className="font-noto-nastaliq text-lg text-[var(--color-text-secondary)]">
                                            {customer.nameUrdu || "-"}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">{customer.phone || "-"}</TableCell>
                                        <TableCell className="text-right font-medium text-[var(--color-text-primary)]">
                                            {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                                style: "currency",
                                                currency: "PKR",
                                            }).format(Number(customer.balance))}
                                        </TableCell>
                                        <TableCell>
                                            {customer.isBadDebt ? (
                                                <Badge variant="danger">{t("badDebt")}</Badge>
                                            ) : (
                                                <Badge variant="success">{t("good")}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/${locale}/customers/${customer.id}/edit`}>
                                                    <Button size="sm" variant="outline">
                                                        {tActions("edit")}
                                                    </Button>
                                                </Link>
                                                <Link href={`/${locale}/customers/${customer.id}`}>
                                                    <Button size="sm" variant="secondary">
                                                        {tActions("view")}
                                                    </Button>
                                                </Link>
                                                <DeleteCustomerButton
                                                    customerId={customer.id}
                                                    customerName={customer.name}
                                                    label={tActions("delete")}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-[var(--color-text-muted)]">
                                        {t("noCustomers")}
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
