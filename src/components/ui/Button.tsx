import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        // Base styles are handled by .btn class in globals.css

        const variants = {
            primary: 'btn btn-primary',
            secondary: 'btn btn-secondary',
            outline: 'btn bg-transparent border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] text-[var(--color-text-primary)]',
            ghost: 'btn bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            danger: 'btn bg-[var(--color-error)] text-white hover:opacity-90',
        };

        const sizes = {
            sm: 'text-[var(--font-xs)] py-1.5 px-3',
            md: 'text-[var(--font-sm)] py-2.5 px-5',
            lg: 'text-[var(--font-base)] py-3 px-6',
        };

        return (
            <button
                ref={ref}
                className={`${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
