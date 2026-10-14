import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className = '', variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
            secondary: 'border-[var(--color-border)] bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]',
            outline: 'border-[var(--color-border-light)] text-[var(--color-text-primary)]',
            success: 'border-green-500/30 bg-green-500/15 text-green-300',
            danger: 'border-red-500/30 bg-red-500/15 text-red-300',
            warning: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
        };

        return (
            <span
                ref={ref}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';
