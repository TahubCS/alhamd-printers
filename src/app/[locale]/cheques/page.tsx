import { getTranslations } from 'next-intl/server';
import ChequeStats from '@/components/cheques/ChequeStats';
import ChequeList from '@/components/cheques/ChequeList';
import { getCheques } from '@/actions/payment';

export const dynamic = "force-dynamic";

export default async function ChequesPage() {
    const t = await getTranslations('cheques');

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
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                        {t('title')}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="mb-6">
                <ChequeStats stats={stats} />
            </div>

            {/* Cheque List */}
            <ChequeList cheques={cheques} />
        </div>
    );
}
