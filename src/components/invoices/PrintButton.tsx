"use client";

import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print Invoice" }: { label?: string }) {
    return (
        <Button onClick={() => window.print()} className="print:hidden">
            <Printer className="w-4 h-4" aria-hidden="true" />
            {label}
        </Button>
    );
}
