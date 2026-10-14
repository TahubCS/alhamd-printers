"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cancelPurchaseOrder } from "@/actions/supplier";
import { Button } from "@/components/ui/Button";

export default function CancelPurchaseButton({ purchaseOrderId }: { purchaseOrderId: string }) {
    const t = useTranslations("suppliers");
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleCancel = async () => {
        if (!window.confirm(t("confirmCancel"))) return;
        setBusy(true);
        const result = await cancelPurchaseOrder(purchaseOrderId);
        setBusy(false);
        if (!result.success) {
            alert(result.error);
            return;
        }
        router.refresh();
    };

    return <Button variant="outline" onClick={handleCancel} isLoading={busy}>{t("cancelPurchase")}</Button>;
}
