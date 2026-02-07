import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
    ({ className = '', variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80',
            secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
            outline: 'text-foreground',
            success: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
            danger: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
            warning: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        };

        return (
            <div
                ref={ref}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';
