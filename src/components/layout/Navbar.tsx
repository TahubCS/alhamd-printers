'use client';

import { useTranslations, useLocale } from 'next-intl';
import { LogOut, Menu } from 'lucide-react';
import LanguageToggle from './LanguageToggle';

interface NavbarProps {
    onMenuClick?: () => void;
    sidebarOpen?: boolean;
}

export default function Navbar({ onMenuClick, sidebarOpen = false }: NavbarProps) {
    const t = useTranslations('common');
    const tAuth = useTranslations('auth');
    const locale = useLocale();

    return (
        <header className="navbar">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors md:hidden"
                    aria-label={t('openMenu')}
                    aria-expanded={sidebarOpen}
                >
                    <Menu className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                <LanguageToggle />

                <form method="post" action="/api/auth/logout">
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="lang-toggle" aria-label={tAuth('logout')}>
                        <LogOut className="w-4 h-4 rtl:-scale-x-100" aria-hidden="true" />
                        <span className="hidden sm:inline">{tAuth('logout')}</span>
                    </button>
                </form>
            </div>
        </header>
    );
}
