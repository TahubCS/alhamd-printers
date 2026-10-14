"use client";

import { Button } from "@/components/ui/Button";
import { Download, Loader2 } from "lucide-react";
import InvoicePDF, { InvoiceDetails } from "./InvoicePDF";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

interface Props {
    invoice: InvoiceDetails;
    company: InvoiceDetails["company"];
}

const subscribe = () => () => {};

export default function DownloadInvoiceButton({ invoice, company }: Props) {
    // PDF rendering only works in the browser; render a placeholder during SSR
    const isClient = useSyncExternalStore(subscribe, () => true, () => false);
    const t = useTranslations("invoices.details");

    if (!isClient) {
        return <Button disabled variant="outline"><Loader2 className="w-4 h-4 animate-spin" /> {t("preparingPdf")}</Button>;
    }

    return (
        <PDFDownloadLink
            document={<InvoicePDF invoice={invoice} company={company} />}
            fileName={`invoice-${invoice.invoiceNo}.pdf`}
        >
            {({ loading }) => (
                <Button disabled={loading} variant="outline" className="border-[var(--color-border)]">
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {t("generatingPdf")}
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" aria-hidden="true" /> {t("downloadPdf")}
                        </>
                    )}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
