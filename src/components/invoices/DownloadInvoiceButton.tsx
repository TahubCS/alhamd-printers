"use client";

import { Button } from "@/components/ui/Button";
// import dynamic from "next/dynamic";
import { Download, FileText, Loader2 } from "lucide-react";
import InvoicePDF from "./InvoicePDF";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useEffect, useState } from "react";

// Dynamically import PDFDownloadLink is often problematic with SSR, 
// so we'll just use client-side rendering protection
// const PDFDownloadLink = dynamic(
//     () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
//     { ssr: false, loading: () => <Button disabled variant="outline">Loading PDF...</Button> }
// );

interface Props {
    invoice: any;
    company: any;
}

export default function DownloadInvoiceButton({ invoice, company }: Props) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <Button disabled variant="outline"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing PDF...</Button>;
    }

    return (
        <PDFDownloadLink
            document={<InvoicePDF invoice={invoice} company={company} />}
            fileName={`invoice-${invoice.invoiceNumber}.pdf`}
        >
            {({ blob, url, loading, error }) => (
                <Button disabled={loading} variant="outline" className="border-[var(--color-border)]">
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                        </>
                    )}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
