import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/products/ProductForm";

export default async function NewProductPage() {
    const t = await getTranslations("products");
    return (
        <div className="mx-auto max-w-3xl animate-fade-in">
            <PageHeader title={t("newProduct")} subtitle={t("formSubtitle")} />
            <ProductForm />
        </div>
    );
}
