'use client';

import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

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
            color: 'text-[var(--color-text-primary)]',
        },
        {
            title: t('cleared'),
            value: stats.cleared.toString(),
            count: null,
            icon: CheckCircle,
            color: 'text-[var(--color-success)]',
        },
        {
            title: t('bounced'),
            value: stats.bounced.toString(),
            count: null,
            icon: XCircle,
            color: stats.bounced > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]',
        }
    ];

    return (
        <div className="kpi-grid grid-cols-1 md:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.title} className="stat-card">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-[13px] text-[var(--color-text-secondary)]">{card.title}</p>
                            <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth={1.75} aria-hidden="true" />
                        </div>
                        <p className={`mt-1.5 text-2xl font-semibold leading-8 tabular-nums ${card.color}`}>{card.value}</p>
                        {card.count !== null && (
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                {card.count} {isUrdu ? 'چیکس' : 'Cheques'}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
