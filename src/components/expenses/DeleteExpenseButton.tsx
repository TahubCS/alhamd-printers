'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteExpense } from '@/actions/expense';
import { Trash2 } from 'lucide-react';

interface DeleteExpenseButtonProps {
    expenseId: string;
    label?: string;
}

export default function DeleteExpenseButton({ expenseId, label }: DeleteExpenseButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm('Are you sure you want to delete this expense?');
        if (!confirmed) return;

        setIsDeleting(true);
        const result = await deleteExpense(expenseId);
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
            <Trash2 className="w-3 h-3" />
        </Button>
    );
}
