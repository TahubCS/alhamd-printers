import { HTMLAttributes, forwardRef, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
    ({ className = '', ...props }, ref) => (
        <div className="relative w-full overflow-auto">
            <table
                ref={ref}
                className={`w-full caption-bottom text-sm ${className}`}
                {...props}
            />
        </div>
    )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = '', ...props }, ref) => (
        <thead ref={ref} className={`[&_tr]:border-b [&_tr]:border-[var(--color-border)] ${className}`} {...props} />
    )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = '', ...props }, ref) => (
        <tbody
            ref={ref}
            className={`[&_tr:last-child]:border-0 ${className}`}
            {...props}
        />
    )
);
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
    ({ className = '', ...props }, ref) => (
        <tr
            ref={ref}
            className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-hover)] data-[state=selected]:bg-[var(--color-bg-hover)] ${className}`}
            {...props}
        />
    )
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className = '', ...props }, ref) => (
        <th
            ref={ref}
            className={`h-12 px-4 text-left align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`}
            {...props}
        />
    )
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className = '', ...props }, ref) => (
        <td
            ref={ref}
            className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`}
            {...props}
        />
    )
);
TableCell.displayName = 'TableCell';
