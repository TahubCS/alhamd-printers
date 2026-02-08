'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { updateChequeStatus } from '@/actions/payment';
import { MoreHorizontal, ArrowUpRight, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChequeActionMenuProps {
    chequeId: string;
    currentStatus: 'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
}

export default function ChequeActionMenu({ chequeId, currentStatus }: ChequeActionMenuProps) {
    const t = useTranslations('cheques.actions');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleUpdate = async (status: 'DEPOSITED' | 'CLEARED' | 'BOUNCED') => {
        if (!confirm('Are you sure you want to update the status?')) return;

        setIsLoading(true);
        try {
            await updateChequeStatus(chequeId, status);
            setIsOpen(false);
            // Router refresh is handled in server action but we can do it here too just in case
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Failed to update status');
        } finally {
            setIsLoading(false);
        }
    };

    if (currentStatus === 'BOUNCED' || currentStatus === 'CLEARED') {
        return null; // No actions allowed for final states
    }

    return (
        <div className="flex items-center gap-2">
            {currentStatus === 'RECEIVED' && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate('DEPOSITED')}
                    isLoading={isLoading}
                    className="h-8 px-2 text-xs"
                >
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {t('markDeposited')}
                </Button>
            )}

            {currentStatus === 'DEPOSITED' && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate('CLEARED')}
                    isLoading={isLoading}
                    className="h-8 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                >
                    <Check className="w-3 h-3 mr-1" />
                    {t('markCleared')}
                </Button>
            )}

            <Button
                size="sm"
                variant="ghost"
                onClick={() => handleUpdate('BOUNCED')}
                isLoading={isLoading}
                className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                title={t('markBounced')}
            >
                <X className="w-3 h-3" />
            </Button>
        </div>
    );
}
