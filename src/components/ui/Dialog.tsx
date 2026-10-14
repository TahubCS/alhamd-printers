"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
    title: ReactNode;
    description?: ReactNode;
    closeLabel: string;
    onClose: () => void;
    children: ReactNode;
}

/** Modal dialog: labelled for screen readers, closes on Escape or backdrop click, restores focus. */
export function Dialog({ title, description, closeLabel, onClose, children }: DialogProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Runs once on open; onClose is read through a ref so re-renders never move focus
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const firstField = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button[type=submit]");
        firstField?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCloseRef.current();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            previouslyFocused?.focus();
        };
    }, []);

    // Portal to <body>: animated (transformed) page wrappers would otherwise confine position: fixed
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-lg"
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 id={titleId} className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
                        {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]" aria-label={closeLabel}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}
