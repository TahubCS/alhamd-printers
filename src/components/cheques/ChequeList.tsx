'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import ChequeActionMenu from './ChequeActionMenu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

interface Cheque {
    id: string;
    chequeNo: string;
    bankName: string;
    amount: number;
    chequeDate: string;
    receivedDate: string;
    depositDate: string | null;
    clearDate: string | null;
    status: 'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
    customer: {
        id: string;
        name: string;
        nameUrdu: string | null;
    };
}

interface ChequeListProps {
    cheques: Cheque[];
}

export default function ChequeList({ cheques }: ChequeListProps) {
    const t = useTranslations('cheques');
    const locale = useLocale();
    const isUrdu = locale === 'ur';
    const [filter, setFilter] = useState('all');

    const filteredCheques = cheques.filter(cheque => {
        if (filter === 'all') return true;
        return cheque.status.toLowerCase() === filter;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(isUrdu ? 'ur-PK' : 'en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK');
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'RECEIVED': return 'warning'; // Pending deposit
            case 'DEPOSITED': return 'secondary';    // Pending clearance
            case 'CLEARED': return 'success';   // Done
            case 'BOUNCED': return 'danger'; // Failed
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        return t(`stats.${status.toLowerCase()}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: t('tabs.all') },
                    { id: 'received', label: t('tabs.received') },
                    { id: 'deposited', label: t('tabs.deposited') },
                    { id: 'cleared', label: t('tabs.cleared') },
                    { id: 'bounced', label: t('tabs.bounced') }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`
                            px-4 py-2 rounded-full text-sm font-medium transition-all
                            ${filter === tab.id
                                ? 'bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)]">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]">
                            <TableHead>{t('table.date')}</TableHead>
                            <TableHead>{t('table.chequeNo')}</TableHead>
                            <TableHead>{t('table.bank')}</TableHead>
                            <TableHead>{t('table.customer')}</TableHead>
                            <TableHead className="text-right">{t('table.amount')}</TableHead>
                            <TableHead className="text-center">{t('table.status')}</TableHead>
                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCheques.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
                                        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search opacity-50"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                        </div>
                                        <p className="text-base font-medium">No cheques found</p>
                                        <p className="text-sm opacity-70">Try adjusting your filters or record a new payment.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCheques.map((cheque) => (
                                <TableRow key={cheque.id}>
                                    <TableCell className="font-medium">
                                        {formatDate(cheque.chequeDate)}
                                    </TableCell>
                                    <TableCell className="font-mono text-[var(--color-text-secondary)]">
                                        {cheque.chequeNo}
                                    </TableCell>
                                    <TableCell>
                                        {cheque.bankName}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {isUrdu ? (cheque.customer.nameUrdu || cheque.customer.name) : cheque.customer.name}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(cheque.amount)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusVariant(cheque.status)}>
                                            {getStatusLabel(cheque.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <ChequeActionMenu
                                                chequeId={cheque.id}
                                                currentStatus={cheque.status}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
