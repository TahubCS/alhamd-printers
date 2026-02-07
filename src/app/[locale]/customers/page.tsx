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
import { redirect } from "next/navigation";

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>
                <Link href={`/${locale}/customers/new`}>
                    <Button>{t("newCustomer")}</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("title")}</CardTitle>
                        <form className="flex w-full max-w-sm items-center space-x-2">
                            <Input
                                name="q"
                                placeholder={tActions("search")}
                                defaultValue={q}
                                className="h-9"
                            />
                            <Button type="submit" size="sm" variant="secondary">
                                {tActions("search")}
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
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
                                customers.map((customer: any) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell className="font-noto-nastaliq text-lg">
                                            {customer.nameUrdu || "-"}
                                        </TableCell>
                                        <TableCell>{customer.phone || "-"}</TableCell>
                                        <TableCell className="text-right font-medium">
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
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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
