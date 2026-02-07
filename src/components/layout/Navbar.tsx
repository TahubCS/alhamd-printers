'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe, Bell, User, Menu } from 'lucide-react';
import { useTransition } from 'react';

interface NavbarProps {
    onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
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
                >
                    <Globe className="w-4 h-4" />
                    <span>{t('toggleLanguage')}</span>
                </button>

                {/* Notifications */}
                <button className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors relative">
                    <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-accent-primary)] rounded-full"></span>
                </button>

                {/* User Menu */}
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-[var(--color-text-primary)] hidden sm:inline">
                        {locale === 'ur' ? 'ایڈمن' : 'Admin'}
                    </span>
                </button>
            </div>
        </header>
    );
}
