
import { getCustomers } from "@/actions/customer";
import POUploadForm from "@/components/po/POUploadForm";
import { getTranslations } from "next-intl/server";

export default async function NewPOPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("po");

    // Fetch customers for the dropdown matching logic
    const { data: customers } = await getCustomers();

    const isUrdu = locale === 'ur';

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            <div className="mb-8" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <h1
                    className="font-bold text-[var(--color-text-primary)]"
                    style={{
                        fontSize: isUrdu ? '2.5rem' : '2rem',
                        marginBottom: isUrdu ? '16px' : '12px',
                        lineHeight: isUrdu ? '1.4' : '1.2'
                    }}
                >
                    New Purchase Order
                </h1>
                <p
                    className="text-[var(--color-text-secondary)]"
                    style={{
                        fontSize: isUrdu ? '1.2rem' : '1.1rem',
                        lineHeight: isUrdu ? '1.8' : '1.5'
                    }}
                >
                    Upload a PO to automatically extract details and create a record.
                </p>
            </div>

            <POUploadForm customers={customers || []} />
        </div>
    );
}
