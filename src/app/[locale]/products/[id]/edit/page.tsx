import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductById } from "@/actions/product";
import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/products/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const t = await getTranslations("products");
    const { data: product } = await getProductById(id);
    if (!product) notFound();

    return (
        <div className="mx-auto max-w-3xl animate-fade-in p-3 rtl:p-4">
            <PageHeader title={t("editProduct")} subtitle={product.code} />
            <ProductForm product={product} />
        </div>
    );
}
