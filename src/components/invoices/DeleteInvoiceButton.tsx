'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteInvoice } from '@/actions/invoice';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DeleteInvoiceButtonProps {
    invoiceId: string;
    invoiceNo: number;
}

export default function DeleteInvoiceButton({ invoiceId, invoiceNo }: DeleteInvoiceButtonProps) {
    const t = useTranslations("invoices.details");
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm(t("confirmDelete", { number: invoiceNo }));
        if (!confirmed) return;

        setIsDeleting(true);
        const result = await deleteInvoice(invoiceId);
        setIsDeleting(false);

        if (result.success) {
            router.push('/invoices');
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    return (
        <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
        >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {isDeleting ? t("deleting") : t("delete")}
        </Button>
    );
}
