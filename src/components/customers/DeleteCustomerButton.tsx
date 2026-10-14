'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteCustomer } from '@/actions/customer';
import { useTranslations } from 'next-intl';

interface DeleteCustomerButtonProps {
    customerId: string;
    customerName: string;
    label: string;
}

export default function DeleteCustomerButton({ customerId, customerName, label }: DeleteCustomerButtonProps) {
    const t = useTranslations('customers');
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm(t('confirmDelete', { name: customerName }));
        if (!confirmed) return;

        setIsDeleting(true);
        const result = await deleteCustomer(customerId);
        setIsDeleting(false);

        if (result.success) {
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
            {isDeleting ? '...' : label}
        </Button>
    );
}
