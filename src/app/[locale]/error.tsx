'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
export default function ErrorPage({reset}:{reset:()=>void}) { const t=useTranslations('errors'); return <section role="alert" className="card mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">{t('title')}</h1><p className="my-4 text-[var(--color-text-secondary)]">{t('message')}</p><Button onClick={reset}>{t('retry')}</Button></section> }
