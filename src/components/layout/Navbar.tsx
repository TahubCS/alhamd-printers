'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe, Menu } from 'lucide-react';
import { useTransition } from 'react';

interface NavbarProps {
    onMenuClick?: () => void;
    sidebarOpen?: boolean;
}

export default function Navbar({ onMenuClick, sidebarOpen = false }: NavbarProps) {
    const t = useTranslations('common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const toggleLanguage = () => {
        const newLocale = locale === 'en' ? 'ur' : 'en';
        startTransition(() => {
            router.replace(pathname, { locale: newLocale });
        });
    };

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
                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    disabled={isPending}
                    className="lang-toggle"
                    aria-label={t('switchLanguage')}
                >
                    <Globe className="w-4 h-4" />
                    <span>{t('toggleLanguage')}</span>
                </button>

            </div>
        </header>
    );
}
