'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { recordPayment, PaymentFormValues, getBankAccounts } from '@/actions/payment';
import { X, Banknote, CreditCard, Building2, Calendar, Hash, FileText, ArrowRightLeft } from 'lucide-react';

interface PaymentFormProps {
    customerId: string;
    customerName: string;
    currentBalance: number;
    onClose: () => void;
    onSuccess: () => void;
}

interface BankAccount {
    id: string;
    bankName: string;
    accountTitle: string;
    accountNumberMasked: string;
}

export default function PaymentForm({
    customerId,
    customerName,
    currentBalance,
    onClose,
    onSuccess
}: PaymentFormProps) {
    const t = useTranslations('payments');
    const tActions = useTranslations('actions');
    const locale = useLocale();
    const isUrdu = locale === 'ur';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

    const [formData, setFormData] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'CHEQUE' | 'BANK_TRANSFER',
        chequeNo: '',
        bankName: '',
        chequeDate: '',
        notes: '',
        // Bank Transfer
        bankAccountId: '',
        senderBankName: '',
        senderAccountTitle: '',
    });

    useEffect(() => {
        getBankAccounts().then(res => {
            if (res.success) {
                setBankAccounts(res.data);
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const amount = parseFloat(formData.amount);
            if (isNaN(amount) || amount <= 0) {
                setError('Please enter a valid amount');
                setIsSubmitting(false);
                return;
            }

            const payload: PaymentFormValues = {
                customerId,
                amount,
                method: formData.method,
                notes: formData.notes || undefined,
            };

            // Add cheque fields if method is CHEQUE
            if (formData.method === 'CHEQUE') {
                if (!formData.chequeNo || !formData.bankName || !formData.chequeDate) {
                    setError('Please fill in all cheque details');
                    setIsSubmitting(false);
                    return;
                }
                payload.chequeNo = formData.chequeNo;
                payload.bankName = formData.bankName;
                payload.chequeDate = new Date(formData.chequeDate);
            }

            // Add bank transfer fields
            if (formData.method === 'BANK_TRANSFER') {
                if (!formData.bankAccountId) {
                    setError('Please select a bank account');
                    setIsSubmitting(false);
                    return;
                }
                payload.bankAccountId = formData.bankAccountId;
                payload.senderBankName = formData.senderBankName || undefined;
                payload.senderAccountTitle = formData.senderAccountTitle || undefined;
            }

            const result = await recordPayment(payload);

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Failed to record payment');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const paymentMethods = [
        { value: 'CASH', label: isUrdu ? 'نقد' : 'Cash', icon: Banknote },
        { value: 'CHEQUE', label: isUrdu ? 'چیک' : 'Cheque', icon: CreditCard },
        { value: 'BANK_TRANSFER', label: isUrdu ? 'بینک ٹرانسفر' : 'Bank Transfer', icon: Building2 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg mx-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl animate-fade-in"
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                            {isUrdu ? 'ادائیگی ریکارڈ کریں' : 'Record Payment'}
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            {customerName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                </div>

                {/* Current Balance */}
                <div className="px-6 py-4 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">
                            {isUrdu ? 'موجودہ بقایا' : 'Current Balance'}
                        </span>
                        <span className={`text-lg font-bold ${currentBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {new Intl.NumberFormat(isUrdu ? 'ur-PK' : 'en-PK', {
                                style: 'currency',
                                currency: 'PKR',
                            }).format(currentBalance)}
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            {isUrdu ? 'رقم' : 'Amount'} *
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                                PKR
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="input pl-14"
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                            {isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method'} *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = formData.method === method.value;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, method: method.value as 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${isSelected
                                            ? 'bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                                            : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-light)]'
                                            }`}
                                    >
                                        <Icon className="w-6 h-6" />
                                        <span className="text-sm font-medium">{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cheque Fields - Conditional */}
                    {formData.method === 'CHEQUE' && (
                        <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                {isUrdu ? 'چیک کی تفصیلات' : 'Cheque Details'}
                            </h3>

                            {/* Cheque Number */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {isUrdu ? 'چیک نمبر' : 'Cheque Number'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.chequeNo}
                                    onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                                    className="input"
                                    placeholder={isUrdu ? 'چیک نمبر درج کریں' : 'Enter cheque number'}
                                    required={formData.method === 'CHEQUE'}
                                />
                            </div>

                            {/* Bank Name */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {isUrdu ? 'بینک کا نام' : 'Bank Name'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="input"
                                    placeholder={isUrdu ? 'بینک کا نام درج کریں' : 'Enter bank name'}
                                    required={formData.method === 'CHEQUE'}
                                />
                            </div>

                            {/* Cheque Date */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {isUrdu ? 'چیک کی تاریخ' : 'Cheque Date'}
                                </label>
                                <input
                                    type="date"
                                    value={formData.chequeDate}
                                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                                    className="input"
                                    required={formData.method === 'CHEQUE'}
                                />
                            </div>
                        </div>
                    )}

                    {/* Bank Transfer Fields - Conditional */}
                    {formData.method === 'BANK_TRANSFER' && (
                        <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4" />
                                {isUrdu ? 'بینک ٹرانسفر کی تفصیلات' : 'Bank Transfer Details'}
                            </h3>

                            {/* Deposited To (Our Bank) */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
                                    {isUrdu ? 'ڈپازٹ کیا گیا' : 'Deposited To'} *
                                </label>
                                <select
                                    value={formData.bankAccountId}
                                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                                    className="input"
                                    required={formData.method === 'BANK_TRANSFER'}
                                >
                                    <option value="">{isUrdu ? 'بینک اکاؤنٹ منتخب کریں' : 'Select Bank Account'}</option>
                                    {bankAccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.bankName} - {account.accountNumberMasked}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sender Bank (Customer's Bank) */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
                                    {isUrdu ? 'بھیجنے والا بینک (اختیاری)' : 'Sender Bank (Optional)'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.senderBankName}
                                    onChange={(e) => setFormData({ ...formData, senderBankName: e.target.value })}
                                    className="input"
                                    placeholder={isUrdu ? 'کسٹمر کا بینک' : "Customer's Bank Name"}
                                />
                            </div>

                            {/* Sender Account Title (Customer's Title) */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
                                    {isUrdu ? 'اکاؤنٹ کا عنوان (اختیاری)' : 'Account Title (Optional)'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.senderAccountTitle}
                                    onChange={(e) => setFormData({ ...formData, senderAccountTitle: e.target.value })}
                                    className="input"
                                    placeholder={isUrdu ? 'کسٹمر کے اکاؤنٹ کا عنوان' : "Customer's Account Title"}
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {isUrdu ? 'نوٹس (اختیاری)' : 'Notes (Optional)'}
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input min-h-[80px] resize-none"
                            placeholder={isUrdu ? 'اضافی تفصیلات...' : 'Additional details...'}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            {tActions('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting
                                ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...')
                                : (isUrdu ? 'ادائیگی ریکارڈ کریں' : 'Record Payment')
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
