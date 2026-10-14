import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    backLink?: ReactNode;
}

/** Page title block matching the existing module pages, with RTL-friendly sizing. */
export default function PageHeader({ title, subtitle, actions, backLink }: PageHeaderProps) {
    return (
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rtl:mb-12">
            <div className="min-w-0">
                {backLink}
                <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-[2rem] rtl:text-[2.25rem] rtl:leading-snug">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-3 text-[1.05rem] text-[var(--color-text-secondary)] rtl:text-[1.15rem] rtl:leading-loose">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
    );
}
