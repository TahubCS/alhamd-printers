'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteWageEntry } from '@/actions/wage';
import { Trash2 } from 'lucide-react';

interface DeleteWageEntryButtonProps {
    entryId: string;
}

export default function DeleteWageEntryButton({ entryId }: DeleteWageEntryButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm('Are you sure? This will reverse the balance change.');
        if (!confirmed) return;

        setIsDeleting(true);
        const result = await deleteWageEntry(entryId);
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
