'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Users, ShoppingCart, FileText, Package, Wallet, Banknote, CreditCard, ArrowUpRight } from 'lucide-react';

const modules = [
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'orders', href: '/purchase-orders', icon: ShoppingCart },
  { key: 'invoices', href: '/invoices', icon: FileText },
  { key: 'cheques', href: '/cheques', icon: CreditCard },
  { key: 'inventory', href: '/inventory', icon: Package },
  { key: 'expenses', href: '/expenses', icon: Wallet },
  { key: 'wages', href: '/wages', icon: Banknote },
] as const;

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const nav = useTranslations('nav');

  return (
    <div className="animate-fade-in space-y-8">
      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-[var(--color-accent-primary)]">{t('eyebrow')}</p>
        <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-4xl">{t('welcome')}</h1>
        <p className="mt-4 text-base text-[var(--color-text-secondary)] sm:text-lg">{t('subtitle')}</p>
      </header>

      <section aria-labelledby="workspace-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="workspace-title" className="text-xl font-semibold sm:text-2xl">{t('workspace')}</h2>
            <p className="mt-1 text-[var(--color-text-secondary)]">{t('workspaceDescription')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ key, href, icon: Icon }) => (
            <Link key={key} href={href} className="card group flex min-h-32 items-center gap-5 p-5 focus-visible:outline-none sm:p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-hover)] text-[var(--color-accent-primary)] transition-colors group-hover:bg-[var(--color-accent-primary)] group-hover:text-white">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-[var(--color-text-primary)]">{nav(key)}</span>
                <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{t(`modules.${key}`)}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-[var(--color-text-muted)] rtl:-scale-x-100" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
