'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import PaymentForm from '@/components/payments/PaymentForm';

interface CustomerActionsProps {
    customerId: string;
    customerName: string;
    customerBalance: number;
    locale: string;
    labels: {
        edit: string;
        newInvoice: string;
        recordPayment: string;
    };
}

export default function CustomerActions({
    customerId,
    customerName,
    customerBalance,
    locale,
    labels
}: CustomerActionsProps) {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const router = useRouter();

    const handlePaymentSuccess = () => {
        // Refresh the page to show updated data
        router.refresh();
    };

    return (
        <>
            <div className="flex gap-2 w-full sm:w-auto">
                <Link href={`/${locale}/customers/${customerId}/edit`}>
                    <Button variant="outline" className="w-full sm:w-auto">{labels.edit}</Button>
                </Link>
                <Link href={`/${locale}/invoices/new?customerId=${customerId}`}>
                    <Button variant="primary" className="w-full sm:w-auto">{labels.newInvoice}</Button>
                </Link>
                <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setShowPaymentForm(true)}
                >
                    {labels.recordPayment}
                </Button>
            </div>

            {/* Payment Form Modal */}
            {showPaymentForm && (
                <PaymentForm
                    customerId={customerId}
                    customerName={customerName}
                    currentBalance={customerBalance}
                    onClose={() => setShowPaymentForm(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </>
    );
}
