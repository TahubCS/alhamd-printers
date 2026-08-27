import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, id, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        {label}
                    </label>
                )}
                <input
                    id={id}
                    ref={ref}
                    className={`input ${error ? 'border-red-500 focus-visible:ring-red-500' : ''
                        } ${className}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && id ? `${id}-error` : undefined}
                    {...props}
                />
                {error && <p id={id ? `${id}-error` : undefined} role="alert" className="mt-2 text-sm text-[var(--color-error)]">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
