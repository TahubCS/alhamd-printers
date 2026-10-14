"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteChallan } from "@/actions/challan";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

export default function DeleteChallanButton({ challanId, challanNo }: { challanId: string; challanNo: number }) {
    const t = useTranslations("challans");
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm(t("confirmDelete", { number: challanNo }))) return;
        setBusy(true);
        const result = await deleteChallan(challanId);
        setBusy(false);
        if (!result.success) {
            alert(result.error);
            return;
        }
        router.push("/challans");
        router.refresh();
    };

    return (
        <Button variant="danger" onClick={handleDelete} isLoading={busy} aria-label={t("delete")}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
    );
}
