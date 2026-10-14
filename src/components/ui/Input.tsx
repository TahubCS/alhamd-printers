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
                    <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-primary)]">
                        {label}
                    </label>
                )}
                <input
                    id={id}
                    ref={ref}
                    className={`input ${className}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && id ? `${id}-error` : undefined}
                    {...props}
                />
                {error && <p id={id ? `${id}-error` : undefined} role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
