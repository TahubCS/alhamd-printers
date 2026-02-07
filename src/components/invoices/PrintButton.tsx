"use client";

import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

export default function PrintButton() {
    return (
        <Button onClick={() => window.print()} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
        </Button>
    );
}
