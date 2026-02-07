'use client';

import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import {
    TrendingUp,
    FileText,
    Users,
    Package,
    Plus,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export default function DashboardPage() {
    return (
        <MainLayout>
            <Dashboard />
        </MainLayout>
    );
}

function Dashboard() {
    const t = useTranslations('dashboard');
    const tActions = useTranslations('actions');
    const locale = useLocale();
    const isUrdu = locale === 'ur';

    const stats = [
        {
            key: 'todaySales',
            value: 'PKR 45,000',
            change: '+12%',
            isPositive: true,
            icon: TrendingUp
        },
        {
            key: 'pendingInvoices',
            value: '8',
            change: '-2',
            isPositive: true,
            icon: FileText
        },
        {
            key: 'totalCustomers',
            value: '156',
            change: '+5',
            isPositive: true,
            icon: Users
        },
        {
            key: 'lowStock',
            value: '3',
            change: '+1',
            isPositive: false,
            icon: Package
        },
    ];

    const quickActions = [
        { key: 'newInvoice', icon: FileText, href: '/invoices/new' },
        { key: 'addCustomer', icon: Users, href: '/customers/new' },
        { key: 'addExpense', icon: TrendingUp, href: '/expenses/new' },
        { key: 'viewReports', icon: Package, href: '/reports' },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            {/* Header */}
            <div style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <h1
                    className="font-bold text-[var(--color-text-primary)]"
                    style={{
                        fontSize: isUrdu ? '2.5rem' : '2rem',
                        marginBottom: isUrdu ? '16px' : '12px',
                        lineHeight: isUrdu ? '1.4' : '1.2'
                    }}
                >
                    {t('welcome')}
                </h1>
                <p
                    className="text-[var(--color-text-secondary)]"
                    style={{
                        fontSize: isUrdu ? '1.2rem' : '1.1rem',
                        lineHeight: isUrdu ? '1.8' : '1.5'
                    }}
                >
                    {t('subtitle')}
                </p>
            </div>

            {/* Stats Grid */}
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                style={{
                    gap: isUrdu ? '24px' : '20px',
                    marginBottom: isUrdu ? '48px' : '40px'
                }}
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.key}
                            className="card"
                            style={{ padding: isUrdu ? '28px' : '24px' }}
                        >
                            <div
                                className="flex items-start justify-between"
                                style={{ marginBottom: isUrdu ? '20px' : '16px' }}
                            >
                                <div
                                    className="rounded-xl bg-[var(--color-bg-hover)] flex items-center justify-center"
                                    style={{
                                        width: isUrdu ? '52px' : '48px',
                                        height: isUrdu ? '52px' : '48px'
                                    }}
                                >
                                    <Icon
                                        className="text-[var(--color-accent-primary)]"
                                        style={{
                                            width: isUrdu ? '26px' : '22px',
                                            height: isUrdu ? '26px' : '22px'
                                        }}
                                    />
                                </div>
                                <span
                                    className={`flex items-center ${stat.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                                        }`}
                                    style={{
                                        gap: '4px',
                                        fontSize: isUrdu ? '1rem' : '0.9rem'
                                    }}
                                >
                                    {stat.isPositive ? (
                                        <ArrowUpRight style={{ width: '18px', height: '18px' }} />
                                    ) : (
                                        <ArrowDownRight style={{ width: '18px', height: '18px' }} />
                                    )}
                                    {stat.change}
                                </span>
                            </div>
                            <div
                                className="stat-value"
                                style={{ marginBottom: isUrdu ? '8px' : '6px' }}
                            >
                                {stat.value}
                            </div>
                            <div
                                className="stat-label"
                                style={{
                                    fontSize: isUrdu ? '1rem' : '0.9rem',
                                    marginTop: isUrdu ? '8px' : '6px'
                                }}
                            >
                                {t(stat.key)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <h2
                    className="font-semibold text-[var(--color-text-primary)]"
                    style={{
                        fontSize: isUrdu ? '1.6rem' : '1.4rem',
                        marginBottom: isUrdu ? '24px' : '20px'
                    }}
                >
                    {t('quickActions')}
                </h2>
                <div
                    className="grid grid-cols-2 sm:grid-cols-4"
                    style={{ gap: isUrdu ? '24px' : '20px' }}
                >
                    {quickActions.map((action) => {
                        return (
                            <button
                                key={action.key}
                                className="card flex flex-col items-center cursor-pointer hover:border-[var(--color-accent-primary)] transition-all group"
                                style={{
                                    padding: isUrdu ? '32px 24px' : '28px 20px',
                                    gap: isUrdu ? '20px' : '16px'
                                }}
                            >
                                <div
                                    className="rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center group-hover:scale-110 transition-transform"
                                    style={{
                                        width: isUrdu ? '56px' : '48px',
                                        height: isUrdu ? '56px' : '48px'
                                    }}
                                >
                                    <Plus
                                        className="text-white"
                                        style={{
                                            width: isUrdu ? '28px' : '24px',
                                            height: isUrdu ? '28px' : '24px'
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors text-center"
                                    style={{ fontSize: isUrdu ? '1rem' : '0.9rem' }}
                                >
                                    {tActions(action.key)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2
                    className="font-semibold text-[var(--color-text-primary)]"
                    style={{
                        fontSize: isUrdu ? '1.6rem' : '1.4rem',
                        marginBottom: isUrdu ? '24px' : '20px'
                    }}
                >
                    {t('recentActivity')}
                </h2>
                <div
                    className="card"
                    style={{ padding: isUrdu ? '40px' : '32px' }}
                >
                    <div
                        className="flex flex-col items-center justify-center text-center"
                        style={{ padding: isUrdu ? '48px 0' : '40px 0' }}
                    >
                        <div
                            className="rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center"
                            style={{
                                width: isUrdu ? '80px' : '72px',
                                height: isUrdu ? '80px' : '72px',
                                marginBottom: isUrdu ? '24px' : '20px'
                            }}
                        >
                            <FileText
                                className="text-[var(--color-text-muted)]"
                                style={{
                                    width: isUrdu ? '40px' : '36px',
                                    height: isUrdu ? '40px' : '36px'
                                }}
                            />
                        </div>
                        <p
                            className="text-[var(--color-text-secondary)]"
                            style={{ fontSize: isUrdu ? '1.2rem' : '1.1rem' }}
                        >
                            {isUrdu ? 'ابھی کوئی حالیہ سرگرمی نہیں' : 'No recent activity to show'}
                        </p>
                        <p
                            className="text-[var(--color-text-muted)]"
                            style={{
                                fontSize: isUrdu ? '1rem' : '0.9rem',
                                marginTop: isUrdu ? '12px' : '8px'
                            }}
                        >
                            {isUrdu ? 'شروع کرنے کے لیے اپنا پہلا بل بنائیں' : 'Create your first invoice to get started'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
