import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

// Base styles come from .btn in globals.css
const variants = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    outline: 'btn btn-secondary',
    ghost: 'btn bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
    danger: 'btn border-[#F3C3BE] bg-[var(--color-bg-tertiary)] text-[var(--color-error)] hover:bg-[var(--color-error-soft)]',
};

const sizes = {
    sm: 'min-h-8 px-3 text-[13px]',
    md: '',
    lg: 'min-h-10 px-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    )
);

Button.displayName = 'Button';
