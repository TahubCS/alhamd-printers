'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    Package,
    Wallet,
    Banknote,
    CreditCard,
    Settings,
    Boxes,
    Truck,
    Factory,
    type LucideIcon,
} from 'lucide-react';

interface NavItem {
    key: string;
    href: string;
    icon: LucideIcon;
}

const navGroups: { key: string | null; items: NavItem[] }[] = [
    { key: null, items: [{ key: 'dashboard', href: '/', icon: LayoutDashboard }] },
    {
        key: 'sales',
        items: [
            { key: 'customers', href: '/customers', icon: Users },
            { key: 'orders', href: '/purchase-orders', icon: ShoppingCart },
            { key: 'challans', href: '/challans', icon: Truck },
            { key: 'invoices', href: '/invoices', icon: FileText },
            { key: 'cheques', href: '/cheques', icon: CreditCard },
        ],
    },
    {
        key: 'operations',
        items: [
            { key: 'products', href: '/products', icon: Boxes },
            { key: 'inventory', href: '/inventory', icon: Package },
            { key: 'suppliers', href: '/suppliers', icon: Factory },
        ],
    },
    {
        key: 'finance',
        items: [
            { key: 'expenses', href: '/expenses', icon: Wallet },
            { key: 'wages', href: '/wages', icon: Banknote },
        ],
    },
];

export default function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
    const t = useTranslations('nav');
    const tCommon = useTranslations('common');
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

    const renderItem = ({ key, href, icon: Icon }: NavItem) => {
        const active = isActive(href);
        return (
            <Link
                key={key}
                href={href}
                className={`nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
            >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{t(key)}</span>
            </Link>
        );
    };

    return (
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('primaryNavigation')}>
            <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
                <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-primary)] text-[13px] font-semibold text-white"
                >
                    AH
                </span>
                <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold text-[var(--color-sidebar-strong)]">{tCommon('appName')}</span>
                    <span className="block truncate text-xs text-[var(--color-sidebar-muted)]">{t('workspace')}</span>
                </span>
            </div>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
                {navGroups.map((group) => (
                    <div key={group.key ?? 'home'} className="flex flex-col gap-0.5">
                        {group.key && <span className="nav-group-label">{t(`groups.${group.key}`)}</span>}
                        {group.items.map(renderItem)}
                    </div>
                ))}
            </nav>

            <div className="border-t border-[var(--color-sidebar-edge)] px-3 py-3">
                {renderItem({ key: 'settings', href: '/settings', icon: Settings })}
            </div>
        </aside>
    );
}
