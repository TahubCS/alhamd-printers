import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

const VARIANTS = { PENDING: "default", PARTIAL: "warning", RECEIVED: "success", CANCELLED: "secondary" } as const;

export default function PurchaseStatusBadge({ status }: { status: keyof typeof VARIANTS }) {
    const t = useTranslations("suppliers.purchaseStatus");
    return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>;
}
