'use client';

import { useTranslations, useLocale } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    Package,
    Wallet,
    Banknote,
    BarChart3,
    Settings,
    Printer,
    CreditCard
} from 'lucide-react';

const navItems = [
    { key: 'dashboard', href: '/', icon: LayoutDashboard },
    { key: 'customers', href: '/customers', icon: Users },
    { key: 'orders', href: '/purchase-orders', icon: ShoppingCart },
    { key: 'invoices', href: '/invoices', icon: FileText },
    { key: 'cheques', href: '/cheques', icon: CreditCard },
    { key: 'inventory', href: '/inventory', icon: Package },
    { key: 'expenses', href: '/expenses', icon: Wallet },
    { key: 'wages', href: '/wages', icon: Banknote },
    { key: 'reports', href: '/reports', icon: BarChart3 },
    { key: 'settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const t = useTranslations('nav');
    const tCommon = useTranslations('common');
    const pathname = usePathname();
    const locale = useLocale();
    const isUrdu = locale === 'ur';

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className={`${isUrdu ? 'p-8' : 'p-6'} border-b border-[var(--color-border)]`}>
                <div className={`flex items-center ${isUrdu ? 'gap-4' : 'gap-3'}`}>
                    <div className={`${isUrdu ? 'w-12 h-12' : 'w-11 h-11'} rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center flex-shrink-0`}>
                        <Printer className={`${isUrdu ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
                    </div>
                    <div>
                        <h1 className={`${isUrdu ? 'text-xl' : 'text-lg'} font-bold text-[var(--color-text-primary)]`}>
                            {tCommon('appName')}
                        </h1>
                        <p className={`${isUrdu ? 'text-sm' : 'text-xs'} text-[var(--color-text-muted)]`}>
                            {isUrdu ? 'بزنس مینجمنٹ' : 'Business Management'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${isUrdu ? 'py-6' : 'py-4'} overflow-y-auto`}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`nav-item relative ${isActive ? 'active' : ''}`}
                        >
                            <Icon className={`${isUrdu ? 'w-6 h-6' : 'w-5 h-5'}`} />
                            <span>{t(item.key)}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className={`${isUrdu ? 'p-6' : 'p-4'} border-t border-[var(--color-border)]`}>
                <p className={`${isUrdu ? 'text-sm' : 'text-xs'} text-center text-[var(--color-text-muted)]`}>
                    © 2026 {isUrdu ? 'الحمد پرنٹرز' : 'Al-Hamd Printers'}
                </p>
            </div>
        </aside>
    );
}
