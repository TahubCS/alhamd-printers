'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';

export default function LanguageToggle() {
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
        <button
            onClick={toggleLanguage}
            disabled={isPending}
            className="lang-toggle"
            aria-label={t('switchLanguage')}
        >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>{t('toggleLanguage')}</span>
        </button>
    );
}
