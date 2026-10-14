import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

const VARIANTS = { DRAFT: "secondary", OPEN: "default", PARTIAL: "warning", CLOSED: "success", REJECTED: "danger" } as const;

export default function POStatusBadge({ status }: { status: keyof typeof VARIANTS }) {
    const t = useTranslations("orders.statusLabel");
    return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>;
}
