import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
}

// Soft fill + dark text keeps every state readable on the light surfaces; the dot
// means status never relies on the fill colour alone.
const variants = {
    default: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
    secondary: 'bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]',
    outline: 'border border-[var(--color-border-light)] text-[var(--color-text-secondary)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    danger: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
    warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className = '', variant = 'default', children, ...props }, ref) => (
        <span
            ref={ref}
            className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-px text-xs font-medium leading-5', variants[variant], className)}
            {...props}
        >
            {variant !== 'outline' && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />}
            {children}
        </span>
    )
);

Badge.displayName = 'Badge';
