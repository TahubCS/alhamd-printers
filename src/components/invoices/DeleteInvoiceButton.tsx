'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteInvoice } from '@/actions/invoice';
import { Trash2 } from 'lucide-react';

interface DeleteInvoiceButtonProps {
    invoiceId: string;
    invoiceNo: number;
}

export default function DeleteInvoiceButton({ invoiceId, invoiceNo }: DeleteInvoiceButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete Invoice #${invoiceNo}?\n\nThis will:\n• Remove the invoice and all line items\n• Reverse the customer's balance\n• Delete the associated ledger entry\n\nThis action cannot be undone.`
        );
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
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
    );
}
