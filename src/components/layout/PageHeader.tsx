import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    backLink?: ReactNode;
}

/** Page title row: title and one-line description on the start side, actions on the end side. */
export default function PageHeader({ title, subtitle, actions, backLink }: PageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {backLink}
                <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
