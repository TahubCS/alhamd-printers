import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { getProductCatalog } from "@/actions/product";
import PageHeader from "@/components/layout/PageHeader";
import ProductStatusButton from "@/components/products/ProductStatusButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("products");
    const tActions = await getTranslations("actions");
    const { data: products = [] } = await getProductCatalog();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <Link href="/products/new">
                        <Button>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t("newProduct")}
                        </Button>
                    </Link>
                }
            />

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("code")}</TableHead>
                                <TableHead>{t("name")}</TableHead>
                                <TableHead>{t("specs")}</TableHead>
                                <TableHead className="text-end">{t("basePrice")}</TableHead>
                                <TableHead className="text-end">{t("buttonPrice")}</TableHead>
                                <TableHead>{t("status")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <TableRow key={product.id} className={product.isActive ? "" : "opacity-60"}>
                                        <TableCell className="font-mono font-medium text-[var(--color-text-primary)]" dir="ltr">
                                            {product.code}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-[var(--color-text-primary)]">{product.name}</div>
                                            {product.nameUrdu && (
                                                <div className="text-sm text-[var(--color-text-muted)]" dir="rtl">{product.nameUrdu}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                {product.thickness && <Badge variant="secondary">{product.thickness}</Badge>}
                                                {product.withTape && <Badge variant="secondary">{t("withTape")}</Badge>}
                                                {product.withPrint && <Badge variant="secondary">{t("withPrint")}</Badge>}
                                                {!product.thickness && !product.withTape && !product.withPrint && "—"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-end font-medium text-[var(--color-text-primary)]">
                                            {formatPKR(product.basePrice, locale, 2)}
                                        </TableCell>
                                        <TableCell className="text-end text-[var(--color-text-secondary)]">
                                            {formatPKR(product.buttonPrice, locale, 2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.isActive ? "success" : "warning"}>
                                                {product.isActive ? t("active") : t("archived")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/products/${product.id}/edit`}>
                                                    <Button size="sm" variant="secondary">{tActions("edit")}</Button>
                                                </Link>
                                                <ProductStatusButton productId={product.id} isActive={product.isActive} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-[var(--color-text-muted)]">
                                        {t("empty")}
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
