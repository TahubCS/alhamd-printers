import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import ChequeStats from '@/components/cheques/ChequeStats';
import ChequeList from '@/components/cheques/ChequeList';
import { getCheques } from '@/actions/payment';

export default async function ChequesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations('cheques');
    const isUrdu = locale === 'ur';

    // Fetch data
    const result = await getCheques();
    const cheques = result.success && result.data ? result.data : [];

    // Compute stats
    const stats = {
        received: cheques.filter(c => c.status === 'RECEIVED').length,
        deposited: cheques.filter(c => c.status === 'DEPOSITED').length,
        cleared: cheques.filter(c => c.status === 'CLEARED').length,
        bounced: cheques.filter(c => c.status === 'BOUNCED').length,
        // Pending amount = Received + Deposited (money not yet cleared)
        totalPendingAmount: cheques
            .filter(c => ['RECEIVED', 'DEPOSITED'].includes(c.status))
            .reduce((acc, c) => acc + c.amount, 0)
    };

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <div>
                    <h1
                        className="font-bold text-[var(--color-text-primary)]"
                        style={{
                            fontSize: isUrdu ? '2.5rem' : '2rem',
                            marginBottom: isUrdu ? '16px' : '12px',
                            lineHeight: isUrdu ? '1.4' : '1.2'
                        }}
                    >
                        {t('title')}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{ fontSize: isUrdu ? '1.125rem' : '1rem' }}
                    >
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div style={{ marginBottom: isUrdu ? '40px' : '32px' }}>
                <ChequeStats stats={stats} />
            </div>

            {/* Cheque List */}
            <ChequeList cheques={cheques} />
        </div>
    );
}
