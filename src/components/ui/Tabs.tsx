
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props} />
));
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex flex-wrap items-center gap-0.5 rounded-md bg-[var(--color-neutral-soft)] p-0.5 text-[var(--color-text-secondary)]",
            className
        )}
        {...props}
    />
));
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
    activeValue?: string;
    setActiveValue?: (value: string) => void;
}

const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    TabsTriggerProps
>(({ className, value, activeValue, setActiveValue, onClick, ...props }, ref) => {
    const isActive = value === activeValue;
    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                "inline-flex h-8 items-center justify-center whitespace-nowrap rounded px-3 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                isActive
                    ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                className
            )}
            onClick={(e) => {
                setActiveValue?.(value);
                onClick?.(e);
            }}
            {...props}
        />
    );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string; activeValue?: string }
>(({ className, value, activeValue, ...props }, ref) => {
    if (value !== activeValue) return null;
    return (
        <div
            ref={ref}
            className={cn(
                "mt-4",
                className
            )}
            {...props}
        />
    );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
