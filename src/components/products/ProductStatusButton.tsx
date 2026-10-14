"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setProductActive } from "@/actions/product";
import { Button } from "@/components/ui/Button";

export default function ProductStatusButton({ productId, isActive }: { productId: string; isActive: boolean }) {
    const t = useTranslations("products");
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const toggle = async () => {
        if (isActive && !window.confirm(t("confirmArchive"))) return;
        setBusy(true);
        const result = await setProductActive(productId, !isActive);
        setBusy(false);
        if (!result.success) {
            alert(result.error);
            return;
        }
        router.refresh();
    };

    return (
        <Button size="sm" variant="outline" onClick={toggle} isLoading={busy}>
            {isActive ? t("archive") : t("restore")}
        </Button>
    );
}
