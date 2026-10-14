"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { processPOUpload, confirmCustomerPO } from "@/actions/po-automation";
import type { ExtractedPOData } from "@/lib/ai/po-extractor";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Upload, FileText, Loader2, Plus, Trash, Check, Building2, Phone, Mail, MapPin, CreditCard, X, Settings2, Eye } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { calculateDocumentTotals } from "@/lib/finance";
import { formatPKR } from "@/lib/utils";
import ExtractionChecks from "@/components/ai/ExtractionChecks";
import type { MatchReason } from "@/lib/ai/customer-match";
import type { ProductMatchReason } from "@/lib/ai/product-match";

interface POItem {
    description: string;
    quantity: number | string;
    rate: number | string;
    amount: number | string;
    gstRate?: number | string;
    unit?: string;
    customAttributes?: Record<string, string | null>;
    productId?: string;
    // Set for AI-read lines so the confirmation can be learned
    suggestedProductId?: string | null;
    productMatch?: ProductMatchReason | null;
    sourceDescription?: string | null;
    sourceProductCode?: string | null;
}

interface ProductOption {
    id: string;
    code: string;
    name: string;
}

interface POFormData {
    customerId: string;
    newCustomerName: string;
    newCustomerNameUrdu: string;
    newCustomerPhone: string;
    newCustomerEmail: string;
    newCustomerAddress: string;
    newCustomerNTN: string;
    newCustomerGST: string;
    poNumber: string;
    date: string;
    items: POItem[];
    totalAmount: number | string;
    paymentTerms: string;
    notes: string;
}

interface CustomerOption {
    id: string;
    name: string;
    nameUrdu: string | null;
}

export default function POUploadForm({ customers, products, aiEnabled }: { customers: CustomerOption[]; products: ProductOption[]; aiEnabled: boolean }) {
    const t = useTranslations("orders.upload");
    const locale = useLocale();
    const [step, setStep] = useState<"upload" | "review">("upload");
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedFileType, setUploadedFileType] = useState<string>("");
    const [extractedData, setExtractedData] = useState<ExtractedPOData | null>(null);
    const [matchReason, setMatchReason] = useState<MatchReason | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [globalGst, setGlobalGst] = useState<number>(0);
    const [customColumns, setCustomColumns] = useState<string[]>([]);
    const [showAttrModal, setShowAttrModal] = useState(false);
    const [newAttrName, setNewAttrName] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const router = useRouter();

    const form = useForm<POFormData>({
        defaultValues: {
            items: [],
            newCustomerName: "",
            newCustomerNameUrdu: "",
            newCustomerPhone: "",
            newCustomerEmail: "",
            newCustomerAddress: "",
            newCustomerNTN: "",
            newCustomerGST: "",
            paymentTerms: "",
            notes: ""
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleFile = async (file: File) => {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setUploadedFileType(file.type);

        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        const result = await processPOUpload(formData);
        setIsLoading(false);

        if (result.success && result.data) {
            const { extracted, matchedCustomer, matchReason } = result.data;
            setExtractedData(extracted);
            setMatchReason(matchReason);

            // Populate form with ALL extracted data
            form.reset({
                customerId: matchedCustomer?.id || "",
                newCustomerName: !matchedCustomer ? (extracted.customer?.name || "") : "",
                newCustomerNameUrdu: !matchedCustomer ? (extracted.customer?.nameUrdu || "") : "",
                newCustomerPhone: !matchedCustomer ? (extracted.customer?.phone || "") : "",
                newCustomerEmail: !matchedCustomer ? (extracted.customer?.email || "") : "",
                newCustomerAddress: !matchedCustomer ? (extracted.customer?.address || "") : "",
                newCustomerNTN: !matchedCustomer ? (extracted.customer?.ntn || "") : "",
                newCustomerGST: !matchedCustomer ? (extracted.customer?.gstNumber || "") : "",
                poNumber: extracted.poNumber || "",
                date: extracted.date || new Date().toISOString().split('T')[0],
                totalAmount: extracted.totalAmount || 0,
                paymentTerms: extracted.paymentTerms || "",
                notes: extracted.notes || "",
                items: extracted.items?.map((item) => ({
                    description: item.description || "",
                    quantity: item.quantity || 1,
                    rate: item.rate || 0,
                    amount: item.amount || 0,
                    gstRate: item.gstRate || 0,
                    unit: item.unit || "Pieces",
                    customAttributes: item.customAttributes || {},
                    productId: item.productId ?? "",
                    suggestedProductId: item.productId ?? null,
                    productMatch: item.productMatch ?? null,
                    sourceDescription: item.description,
                    sourceProductCode: item.productCode ?? null,
                })) || []
            });

            // Auto-detect custom columns from AI extraction
            const detectedColumns = new Set<string>();
            extracted.items?.forEach((item) => {
                if (item.customAttributes) {
                    Object.keys(item.customAttributes).forEach((key: string) => detectedColumns.add(key));
                }
            });
            if (detectedColumns.size > 0) {
                setCustomColumns(Array.from(detectedColumns));
            }

            setStep("review");
        } else {
            alert(result.error || t("extractFailed"));
        }
    };

    const onSubmit = async (data: POFormData) => {
        setIsLoading(true);

        // Review metadata stays in the browser; only the document fields are saved
        const extractedFields: Partial<ExtractedPOData> = { ...extractedData };
        delete extractedFields.checks;
        delete extractedFields.model;
        delete extractedFields.escalated;
        const submissionData = {
            ...extractedFields,
            ...data,
            items: data.items.map(item => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                rate: Number(item.rate) || 0,
                amount: Number(item.amount) || 0,
                gstRate: Number(item.gstRate) || 0,
                customAttributes: item.customAttributes || {},
                productId: item.productId || null,
            })),
            totalAmount: totals.total,
            // Only AI-read POs teach the app; a hand-typed PO has nothing printed to learn from
            printedCustomerName: extractedData ? extractedData.customer?.name ?? null : undefined,
        };

        const result = await confirmCustomerPO(submissionData);
        setIsLoading(false);

        if (result.success) {
            router.push("/purchase-orders");
            router.refresh();
        } else {
            console.error("PO Save Error:", result.error);
            alert(result.error);
        }
    };

    const createNewCustomer = !form.watch("customerId");
    const watchedItems = form.watch("items") ?? [];
    // Line amounts are always quantity × rate, exactly as the server will store them
    const totals = calculateDocumentTotals(watchedItems.map((item) => ({
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        gstRate: Number(item.gstRate) || 0,
    })));

    if (step === "upload") {
        return (
            <Card
                className={`max-w-xl mx-auto border-2 border-dashed transition-all duration-200 bg-[var(--color-bg-secondary)] ${isDragging
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className="p-12 text-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-[var(--color-primary)]/20">
                                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <p className="text-[var(--color-text-primary)] font-medium">{t("scanning")}</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">{t("scanningDetail")}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className={`p-5 rounded-full transition-colors ${isDragging ? "bg-[var(--color-primary)]/20" : "bg-[var(--color-bg-tertiary)]"
                                }`}>
                                <Upload className={`w-10 h-10 ${isDragging ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
                                    }`} />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                                    {t("title")}
                                </h3>
                                <p className="text-[var(--color-text-secondary)] mb-1">
                                    {t("dropHint")}
                                </p>
                                <p className="text-sm text-[var(--color-text-tertiary)]">
                                    {aiEnabled ? t("aiHint") : t("aiUnavailable")}
                                </p>
                            </div>
                            {aiEnabled && (
                                <>
                                    <label className="btn btn-primary mt-2 cursor-pointer px-6 py-3 focus-within:ring-2 focus-within:ring-[var(--color-accent-primary)]">
                                        <Upload className="w-4 h-4" aria-hidden="true" />
                                        {t("selectFile")}
                                        <input
                                            type="file"
                                            className="sr-only"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileUpload}
                                        />
                                    </label>

                                    <div className="relative flex items-center w-full py-4">
                                        <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                        <span className="flex-shrink-0 mx-4 text-sm text-[var(--color-text-tertiary)]">{t("or")}</span>
                                        <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                    </div>
                                </>
                            )}

                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                    setExtractedData(null);
                                    setMatchReason(null);
                                    setStep("review");
                                    form.reset({
                                        date: new Date().toISOString().split('T')[0],
                                        items: [{ description: "", quantity: 1, rate: 0, amount: 0, gstRate: 0, unit: "Pieces" }],
                                        newCustomerName: "",
                                        newCustomerNameUrdu: "",
                                        newCustomerPhone: "",
                                        newCustomerEmail: "",
                                        newCustomerAddress: "",
                                        newCustomerNTN: "",
                                        newCustomerGST: "",
                                        paymentTerms: "",
                                        notes: ""
                                    });
                                }}
                            >
                                <FileText className="w-4 h-4" aria-hidden="true" />
                                {t("manual")}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Review Form — Full Width */}
            <Card className="flex flex-col bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                <CardHeader className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] py-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-[var(--color-text-primary)]">{t("review")}</CardTitle>
                        <div className="flex items-center gap-3">
                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(true)}
                                    className="btn btn-secondary min-h-8 px-3 text-[13px]"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {t("viewOriginal")}
                                </button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {extractedData && (
                            <ExtractionChecks
                                checks={extractedData.checks}
                                model={extractedData.model}
                                escalated={extractedData.escalated}
                                matchReason={matchReason}
                            />
                        )}

                        {/* Customer Section */}
                        <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] space-y-4">
                            <h3 className="font-semibold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                                {t("customerDetails")}
                            </h3>

                            <div>
                                <Label className="text-[var(--color-text-secondary)]">{t("existingCustomer")}</Label>
                                <select
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-accent-primary)] focus:shadow-[0_0_0_3px_var(--color-accent-glow)] focus:outline-none transition-all cursor-pointer"
                                    {...form.register("customerId")}
                                >
                                    <option value="">{t("createCustomer")}</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.nameUrdu ? `(${c.nameUrdu})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {createNewCustomer && (
                                <div className="space-y-4 pt-3 border-t border-[var(--color-border)]">
                                    <p className="text-xs text-[var(--color-text-tertiary)]">{t("extractedHint")}</p>

                                    {/* Name Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Building2 className="w-3 h-3" /> {t("name")}
                                            </Label>
                                            <Input
                                                {...form.register("newCustomerName")}
                                                placeholder={t("companyName")}
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs">{t("nameUrdu")}</Label>
                                            <Input
                                                {...form.register("newCustomerNameUrdu")}
                                                className="mt-1 font-noto-nastaliq bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                dir="rtl"
                                                placeholder="اردو نام"
                                            />
                                        </div>
                                    </div>

                                    {/* Tax Info Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs">{t("ntn")}</Label>
                                            <Input
                                                {...form.register("newCustomerNTN")}
                                                placeholder={t("ntnPlaceholder")}
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs">{t("gst")}</Label>
                                            <Input
                                                {...form.register("newCustomerGST")}
                                                placeholder={t("gstPlaceholder")}
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {t("phone")}
                                            </Label>
                                            <Input

                                                {...form.register("newCustomerPhone")}
                                                placeholder="021-0000000"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {t("email")}
                                            </Label>
                                            <Input

                                                {...form.register("newCustomerEmail")}
                                                placeholder="info@company.com"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {t("address")}
                                        </Label>
                                        <Input
                                            {...form.register("newCustomerAddress")}
                                            placeholder={t("fullAddress")}
                                            className="mt-1 bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PO Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[var(--color-text-secondary)]">{t("poNumber")}</Label>
                                <Input
                                    {...form.register("poNumber")}
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <Label className="text-[var(--color-text-secondary)]">{t("date")}</Label>
                                <Input
                                    type="date"
                                    {...form.register("date")}
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)] [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Payment Terms & Notes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> {t("paymentTerms")}
                                </Label>
                                <Input
                                    {...form.register("paymentTerms")}
                                    placeholder={t("paymentTermsPlaceholder")}
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <Label className="text-[var(--color-text-secondary)] text-xs">{t("notes")}</Label>
                                <Input
                                    {...form.register("notes")}
                                    placeholder={t("notesPlaceholder")}
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <Label className="text-[var(--color-text-primary)] font-medium">{t("items")}</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2 me-4">
                                        <Label className="text-xs text-[var(--color-text-secondary)]">{t("globalTax")}</Label>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-xs bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            value={globalGst}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setGlobalGst(Number(val) || 0);
                                                const currentItems = form.getValues("items");
                                                form.setValue("items", currentItems.map(item => ({ ...item, gstRate: val })));
                                            }}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            const emptyAttrs: Record<string, string | null> = {};
                                            customColumns.forEach(col => emptyAttrs[col] = null);
                                            append({ description: "", quantity: 1, rate: 0, amount: 0, gstRate: globalGst, unit: "Pieces", customAttributes: emptyAttrs });
                                        }}
                                        className="text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                                    >
                                        <Plus className="w-4 h-4" aria-hidden="true" /> {t("addItem")}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowAttrModal(true)}
                                        className="text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                    >
                                        <Settings2 className="w-4 h-4" aria-hidden="true" /> {t("attributes")}{customColumns.length > 0 && ` (${customColumns.length})`}
                                    </Button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                            <div className="min-w-[680px] space-y-2 p-3">
                                <div className="flex gap-2 text-xs font-medium text-[var(--color-text-secondary)] pb-2 border-b border-[var(--color-border)]">
                                    <div className="flex-[3] min-w-0">{t("description")}</div>
                                    <div className="w-16 text-center shrink-0">{t("qty")}</div>
                                    <div className="w-14 text-center shrink-0">{t("unit")}</div>
                                    {customColumns.map(col => (
                                        <div key={col} className="flex-[1.5] min-w-0 text-center truncate" title={col}>{col}</div>
                                    ))}
                                    <div className="flex-[2] min-w-0 text-center">{t("rate")}</div>
                                    <div className="w-14 text-center shrink-0">{t("tax")}</div>
                                    <div className="flex-[2] min-w-0 text-center">{t("amount")}</div>
                                    <div className="w-9 shrink-0"></div>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-start">
                                        <div className="flex-[3] min-w-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.description`}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        placeholder={t("itemPlaceholder")}
                                                        aria-label={t("description")}
                                                        autoComplete="off"
                                                        className="h-9 text-sm input-compact bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                )}
                                            />
                                            {products.length > 0 && (
                                                <Controller
                                                    control={form.control}
                                                    name={`items.${index}.productId`}
                                                    render={({ field }) => {
                                                        const reason = form.watch(`items.${index}.productMatch`);
                                                        return (
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <select
                                                                    {...field}
                                                                    value={field.value ?? ""}
                                                                    onChange={(e) => {
                                                                        field.onChange(e.target.value);
                                                                        form.setValue(`items.${index}.productMatch`, null);
                                                                    }}
                                                                    aria-label={t("product")}
                                                                    className="input input-compact h-8 min-w-0 flex-1 text-xs"
                                                                >
                                                                    <option value="">{t("noProduct")}</option>
                                                                    {products.map((p) => (
                                                                        <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
                                                                    ))}
                                                                </select>
                                                                {reason && field.value && (
                                                                    <span className={`shrink-0 rounded px-1.5 text-[11px] font-medium leading-5 ${reason === "learned"
                                                                        ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                                                                        : "bg-[var(--color-info-soft)] text-[var(--color-info)]"}`}>
                                                                        {t(`productMatch.${reason}`)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="w-16 shrink-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        type="number"
                                                        autoComplete="off"
                                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="h-9 text-sm text-center input-compact overflow-hidden bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="w-14 shrink-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.unit`}
                                                render={({ field }) => (
                                                    <select
                                                        {...field}
                                                        value={field.value ?? 'Pieces'}
                                                        className="h-9 text-sm text-center px-1 py-1 rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all cursor-pointer w-full appearance-none"
                                                    >
                                                        <option value="Pieces">{t("pieces")}</option>
                                                        <option value="KG">KG</option>
                                                    </select>
                                                )}
                                            />
                                        </div>
                                        {customColumns.map(col => {
                                            const attrs = form.watch(`items.${index}.customAttributes`) as Record<string, string | null> | undefined;
                                            return (
                                                <div key={col} className="flex-[1.5] min-w-0">
                                                    <input
                                                        value={attrs?.[col] ?? ''}
                                                        onChange={(e) => {
                                                            const current = form.getValues(`items.${index}.customAttributes`) as Record<string, string | null> || {};
                                                            form.setValue(`items.${index}.customAttributes`, {
                                                                ...current,
                                                                [col]: e.target.value || null
                                                            });
                                                        }}
                                                        placeholder={col}
                                                        autoComplete="off"
                                                        className="input input-compact h-9 w-full text-sm text-center overflow-hidden bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div className="flex-[2] min-w-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.rate`}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        type="number"
                                                        autoComplete="off"
                                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="h-9 text-sm text-center input-compact overflow-hidden bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="w-14 shrink-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.gstRate`}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        type="number"
                                                        autoComplete="off"
                                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="h-9 text-sm text-center input-compact overflow-hidden bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="flex-[2] min-w-0 text-center text-sm font-medium leading-9 text-[var(--color-text-primary)]" aria-label={t("amount")}>
                                            {formatPKR(totals.lines[index]?.amount ?? 0, locale, 2)}
                                        </div>
                                        <div className="w-9 shrink-0 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                aria-label={t("removeItem")}
                                                className="h-9 w-9 p-0 flex items-center justify-center rounded-lg hover:bg-[var(--color-error-soft)] transition-colors cursor-pointer"
                                            >
                                                <Trash className="w-4 h-4" style={{ color: 'var(--color-error)', stroke: 'var(--color-error)' }} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {fields.length === 0 && (
                                    <div className="text-center py-4 text-[var(--color-text-tertiary)]">
                                        {t("noItems")}
                                    </div>
                                )}
                            </div>
                            </div>

                            {/* Custom Attributes Modal */}
                            {showAttrModal && (
                                <div className="fixed inset-0 bg-[#111827]/45 flex items-center justify-center z-50" onClick={() => setShowAttrModal(false)}>
                                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 w-full max-w-md shadow-[var(--shadow-lg)]" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("customColumns")}</h3>
                                            <button type="button" onClick={() => setShowAttrModal(false)} aria-label={t("close")} className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                                                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">{t("customColumnsHint")}</p>

                                        <div className="flex gap-2 mb-4">
                                            <Input
                                                value={newAttrName}
                                                onChange={(e) => setNewAttrName(e.target.value)}
                                                placeholder={t("columnPlaceholder")}
                                                autoComplete="off"
                                                className="flex-1 h-10 text-sm bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newAttrName.trim()) {
                                                        e.preventDefault();
                                                        const name = newAttrName.trim();
                                                        if (!customColumns.includes(name)) {
                                                            setCustomColumns(prev => [...prev, name]);
                                                            const items = form.getValues('items');
                                                            items.forEach((_, i) => {
                                                                const current = form.getValues(`items.${i}.customAttributes`) || {};
                                                                form.setValue(`items.${i}.customAttributes`, { ...current, [name]: null });
                                                            });
                                                        }
                                                        setNewAttrName("");
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="primary"
                                                disabled={!newAttrName.trim() || customColumns.includes(newAttrName.trim())}
                                                onClick={() => {
                                                    const name = newAttrName.trim();
                                                    if (name && !customColumns.includes(name)) {
                                                        setCustomColumns(prev => [...prev, name]);
                                                        const items = form.getValues('items');
                                                        items.forEach((_, i) => {
                                                            const current = form.getValues(`items.${i}.customAttributes`) || {};
                                                            form.setValue(`items.${i}.customAttributes`, { ...current, [name]: null });
                                                        });
                                                    }
                                                    setNewAttrName("");
                                                }}
                                                className="h-10 px-4"
                                                aria-label={t("addColumn")}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {customColumns.length > 0 ? (
                                            <div className="space-y-2">
                                                {customColumns.map((col) => (
                                                    <div key={col} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                                                        <span className="text-sm text-[var(--color-text-primary)]">{col}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCustomColumns(prev => prev.filter(c => c !== col));
                                                                const items = form.getValues('items');
                                                                items.forEach((__item, i) => {
                                                                    const current = form.getValues(`items.${i}.customAttributes`) || {};
                                                                    const rest = { ...current };
                                                                    delete rest[col];
                                                                    form.setValue(`items.${i}.customAttributes`, rest);
                                                                });
                                                            }}
                                                            className="p-1 rounded hover:bg-[var(--color-error-soft)] transition-colors cursor-pointer"
                                                            aria-label={`${t("removeColumn")}: ${col}`}
                                                        >
                                                            <X className="w-4 h-4" style={{ color: 'var(--color-error)', stroke: 'var(--color-error)' }} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-sm text-[var(--color-text-tertiary)]">
                                                {t("noColumns")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <dl className="ms-auto grid max-w-xs grid-cols-2 gap-y-1 border-t border-[var(--color-border)] pt-4 text-sm">
                            <dt className="text-[var(--color-text-secondary)]">{t("subtotal")}</dt>
                            <dd className="text-end text-[var(--color-text-primary)]">{formatPKR(totals.subtotal, locale, 2)}</dd>
                            <dt className="text-[var(--color-text-secondary)]">{t("gstTotal")}</dt>
                            <dd className="text-end text-[var(--color-text-primary)]">{formatPKR(totals.taxTotal, locale, 2)}</dd>
                            <dt className="text-lg font-semibold text-[var(--color-text-primary)]">{t("total")}</dt>
                            <dd className="text-end text-lg font-semibold text-[var(--color-text-primary)]">{formatPKR(totals.total, locale, 2)}</dd>
                        </dl>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setStep("upload")}>
                                {t("cancel")}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {t("save")}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>

            {/* Preview Modal */}
            {showPreview && previewUrl && (
                <div className="fixed inset-0 bg-[#111827]/75 flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setShowPreview(false)}
                            aria-label={t("close")}
                            className="absolute -top-10 end-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {uploadedFileType === 'application/pdf' ? (
                            <iframe src={previewUrl} title={t("preview")} className="w-full h-[85vh] rounded-lg shadow-[var(--shadow-lg)] bg-white" />
                        ) : (
                            <img src={previewUrl} alt={t("preview")} className="w-full h-full object-contain rounded-lg shadow-[var(--shadow-lg)]" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
