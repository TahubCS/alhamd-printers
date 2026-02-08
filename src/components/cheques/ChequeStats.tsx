'use client';

import { useTranslations, useLocale } from 'next-intl';
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ChequeStatsProps {
    stats: {
        received: number;
        deposited: number;
        cleared: number;
        bounced: number;
        totalPendingAmount: number;
    }
}

export default function ChequeStats({ stats }: ChequeStatsProps) {
    const t = useTranslations('cheques.stats');
    const locale = useLocale();
    const isUrdu = locale === 'ur';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(isUrdu ? 'ur-PK' : 'en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const cards = [
        {
            title: t('pending'),
            value: formatCurrency(stats.totalPendingAmount),
            count: stats.received + stats.deposited,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20'
        },
        {
            title: t('cleared'),
            value: stats.cleared.toString(),
            count: null,
            icon: CheckCircle,
            color: 'text-green-400',
            bg: 'bg-green-400/10',
            border: 'border-green-400/20'
        },
        {
            title: t('bounced'),
            value: stats.bounced.toString(),
            count: null,
            icon: XCircle,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
            border: 'border-red-400/20'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <div
                        key={index}
                        className={`p-6 rounded-2xl border ${card.border} ${card.bg} backdrop-blur-sm relative overflow-hidden group`}
                    >
                        <div className="flex justify-between items-start z-10 relative">
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                                    {card.title}
                                </p>
                                <h3 className={`text-2xl font-bold ${card.color}`}>
                                    {card.value}
                                </h3>
                                {card.count !== null && (
                                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                                        {card.count} {isUrdu ? 'چیکس' : 'Cheques'}
                                    </p>
                                )}
                            </div>
                            <div className={`p-3 rounded-xl bg-[var(--color-bg-primary)]/50 ${card.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
