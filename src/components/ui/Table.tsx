import { HTMLAttributes, forwardRef, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
    ({ className = '', ...props }, ref) => (
        <div className="relative w-full overflow-auto" tabIndex={0} role="region" aria-label="Scrollable data table">
            <table
                ref={ref}
                className={cn('w-full caption-bottom text-sm', className)}
                {...props}
            />
        </div>
    )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = '', ...props }, ref) => (
        <thead ref={ref} className={cn('bg-[var(--color-bg-subtle)] [&_tr]:border-b [&_tr]:border-[var(--color-border)] [&_tr:hover]:bg-transparent', className)} {...props} />
    )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = '', ...props }, ref) => (
        <tbody
            ref={ref}
            className={cn('[&_tr:last-child]:border-0', className)}
            {...props}
        />
    )
);
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
    ({ className = '', ...props }, ref) => (
        <tr
            ref={ref}
            className={cn('border-b border-[var(--color-divider)] transition-colors hover:bg-[var(--color-bg-hover)] data-[state=selected]:bg-[var(--color-bg-hover)]', className)}
            {...props}
        />
    )
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className = '', ...props }, ref) => (
        <th
            ref={ref}
            className={cn('h-10 px-4 text-start align-middle text-xs font-medium whitespace-nowrap text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
            {...props}
        />
    )
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className = '', ...props }, ref) => (
        <td
            ref={ref}
            className={cn('px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
            {...props}
        />
    )
);
TableCell.displayName = 'TableCell';
