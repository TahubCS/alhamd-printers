
"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { processPOUpload, confirmCustomerPO } from "@/actions/po-automation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Upload, FileText, Loader2, Plus, Trash, Check, Building2, Phone, Mail, MapPin, Globe, Calendar, CreditCard, X, Settings2, Eye } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

interface POItem {
    description: string;
    quantity: number | string;
    rate: number | string;
    amount: number | string;
    gstRate?: number | string;
    unit?: string;
    customAttributes?: Record<string, string | null>;
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

export default function POUploadForm({ customers }: { customers: any[] }) {
    const [step, setStep] = useState<"upload" | "review">("upload");
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedFileType, setUploadedFileType] = useState<string>("");
    const [extractedData, setExtractedData] = useState<any>(null);
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
            const { extracted, matchedCustomer } = result.data;
            setExtractedData(extracted);

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
                items: extracted.items?.map((item: any) => ({
                    description: item.description || "",
                    quantity: item.quantity || 1,
                    rate: item.rate || 0,
                    amount: item.amount || 0,
                    gstRate: item.gstRate || 0,
                    unit: item.unit || "Pieces",
                    customAttributes: item.customAttributes || {}
                })) || []
            });

            // Auto-detect custom columns from AI extraction
            const detectedColumns = new Set<string>();
            extracted.items?.forEach((item: any) => {
                if (item.customAttributes) {
                    Object.keys(item.customAttributes).forEach((key: string) => detectedColumns.add(key));
                }
            });
            if (detectedColumns.size > 0) {
                setCustomColumns(Array.from(detectedColumns));
            }

            setStep("review");
        } else {
            alert(result.error || "Failed to extract data");
        }
    };

    const onSubmit = async (data: POFormData) => {
        setIsLoading(true);

        const submissionData = {
            ...extractedData,
            ...data,
            items: data.items.map(item => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                rate: Number(item.rate) || 0,
                amount: Number(item.amount) || 0,
                gstRate: Number(item.gstRate) || 0,
                customAttributes: item.customAttributes || {},
            })),
            totalAmount: Number(data.totalAmount) || 0,
            originalFileUrl: extractedData?.originalFileUrl || null,
            ocrText: extractedData?.ocrText || null
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
                                <p className="text-[var(--color-text-primary)] font-medium">Deep Scanning with AI...</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">Extracting all data from document</p>
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
                                    Upload Purchase Order
                                </h3>
                                <p className="text-[var(--color-text-secondary)] mb-1">
                                    Drag and drop your file here, or click to browse
                                </p>
                                <p className="text-sm text-[var(--color-text-tertiary)]">
                                    AI will extract customer info, items, and all details
                                </p>
                            </div>
                            <div className="relative mt-2">
                                <Button size="lg">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Select File
                                </Button>
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            <div className="relative flex items-center w-full py-4">
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                <span className="flex-shrink-0 mx-4 text-sm text-[var(--color-text-tertiary)]">OR</span>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>

                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                    setExtractedData({}); // Set empty object to bypass check
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
                                <FileText className="w-4 h-4 mr-2" />
                                Create Manually
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="h-[calc(100vh-200px)] flex flex-col">
            {/* Review Form — Full Width */}
            <Card className="flex-1 overflow-hidden flex flex-col bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                <CardHeader className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] py-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-[var(--color-text-primary)]">Review Extracted Data</CardTitle>
                        <div className="flex items-center gap-3">
                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(true)}
                                    className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Original
                                </button>
                            )}
                            <div className="text-xs font-mono bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                                Confidence: {Math.round((extractedData?.confidence || 0) * 100)}%
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Customer Section */}
                        <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] space-y-4">
                            <h3 className="font-semibold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                                Customer Details
                            </h3>

                            <div>
                                <Label className="text-[var(--color-text-secondary)]">Select Existing Customer</Label>
                                <select
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-accent-primary)] focus:shadow-[0_0_0_3px_var(--color-accent-glow)] focus:outline-none transition-all cursor-pointer"
                                    {...form.register("customerId")}
                                >
                                    <option value="">-- Create New Customer from PO --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.nameUrdu ? `(${c.nameUrdu})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {createNewCustomer && (
                                <div className="space-y-4 pt-3 border-t border-[var(--color-border)]">
                                    <p className="text-xs text-[var(--color-text-tertiary)]">AI Extracted Customer Info (edit if needed):</p>

                                    {/* Name Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Building2 className="w-3 h-3" /> Name
                                            </Label>
                                            <Input
                                                {...form.register("newCustomerName")}
                                                placeholder="Company Name"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs">Name (Urdu)</Label>
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
                                            <Label className="text-[var(--color-text-secondary)] text-xs">NTN</Label>
                                            <Input
                                                {...form.register("newCustomerNTN")}
                                                placeholder="National Tax Number"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs">STRN / GST</Label>
                                            <Input
                                                {...form.register("newCustomerGST")}
                                                placeholder="Sales Tax Number"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> Phone
                                            </Label>
                                            <Input

                                                {...form.register("newCustomerPhone")}
                                                placeholder="+92 21 35069311"
                                                className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[var(--color-text-secondary)] text-xs flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> Email
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
                                            <MapPin className="w-3 h-3" /> Address
                                        </Label>
                                        <Input
                                            {...form.register("newCustomerAddress")}
                                            placeholder="Full address"
                                            className="mt-1 bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PO Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[var(--color-text-secondary)]">PO Number</Label>
                                <Input
                                    {...form.register("poNumber")}
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <Label className="text-[var(--color-text-secondary)]">Date</Label>
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
                                    <CreditCard className="w-3 h-3" /> Payment Terms
                                </Label>
                                <Input
                                    {...form.register("paymentTerms")}
                                    placeholder="e.g., 60 days"
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <Label className="text-[var(--color-text-secondary)] text-xs">Notes</Label>
                                <Input
                                    {...form.register("notes")}
                                    placeholder="Special instructions"
                                    className="mt-1 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <Label className="text-[var(--color-text-primary)] font-medium">Items</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 mr-4">
                                        <Label className="text-xs text-[var(--color-text-secondary)]">Global Tax %:</Label>
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
                                        <Plus className="w-4 h-4 mr-1" /> Add Item
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowAttrModal(true)}
                                        className="text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                    >
                                        <Settings2 className="w-4 h-4 mr-1" /> Attributes{customColumns.length > 0 && ` (${customColumns.length})`}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 bg-[var(--color-bg-tertiary)] rounded-lg p-3 border border-[var(--color-border)]">
                                <div className="flex gap-2 text-xs font-medium text-[var(--color-text-secondary)] pb-2 border-b border-[var(--color-border)]">
                                    <div className="flex-[3] min-w-0">Description</div>
                                    <div className="w-16 text-center shrink-0">Qty</div>
                                    <div className="w-14 text-center shrink-0">Unit</div>
                                    {customColumns.map(col => (
                                        <div key={col} className="flex-[1.5] min-w-0 text-center truncate" title={col}>{col}</div>
                                    ))}
                                    <div className="flex-[2] min-w-0 text-center">Rate</div>
                                    <div className="w-14 text-center shrink-0">Tax %</div>
                                    <div className="flex-[2] min-w-0 text-center">Amount</div>
                                    <div className="w-9 shrink-0"></div>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-center">
                                        <div className="flex-[3] min-w-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.description`}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        placeholder="Item description"
                                                        autoComplete="off"
                                                        className="h-9 text-sm input-compact bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                                                    />
                                                )}
                                            />
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
                                                        <option value="Pieces">Pcs</option>
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
                                        <div className="flex-[2] min-w-0">
                                            <Controller
                                                control={form.control}
                                                name={`items.${index}.amount`}
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
                                        <div className="w-9 shrink-0 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="h-9 w-9 p-0 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                            >
                                                <Trash className="w-4 h-4" style={{ color: '#f87171', stroke: '#f87171' }} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {fields.length === 0 && (
                                    <div className="text-center py-4 text-[var(--color-text-tertiary)]">
                                        No items extracted. Click "Add Item" to add manually.
                                    </div>
                                )}
                            </div>

                            {/* Custom Attributes Modal */}
                            {showAttrModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAttrModal(false)}>
                                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Custom Attributes</h3>
                                            <button onClick={() => setShowAttrModal(false)} className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                                                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">Add custom columns like Brand, Size, Remarks, etc. They appear between Unit and Rate for every item.</p>

                                        <div className="flex gap-2 mb-4">
                                            <Input
                                                value={newAttrName}
                                                onChange={(e) => setNewAttrName(e.target.value)}
                                                placeholder="Attribute name (e.g. Brand)"
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
                                                                    const { [col]: _removed, ...rest } = current;
                                                                    form.setValue(`items.${i}.customAttributes`, rest);
                                                                });
                                                            }}
                                                            className="p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        >
                                                            <X className="w-4 h-4" style={{ color: '#f87171', stroke: '#f87171' }} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-sm text-[var(--color-text-tertiary)]">
                                                No custom attributes yet. Add one above.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end items-center gap-4 pt-4 border-t border-[var(--color-border)]">
                            <Label className="text-lg text-[var(--color-text-primary)]">Total Amount:</Label>
                            <Input
                                {...form.register("totalAmount")}
                                inputMode="decimal"
                                className="w-40 text-right font-bold text-lg bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setStep("upload")}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                Confirm & Save PO
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>

            {/* Preview Modal */}
            {showPreview && previewUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPreview(false)}
                            className="absolute -top-10 right-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {uploadedFileType === 'application/pdf' ? (
                            <iframe src={previewUrl} title="PO Preview" className="w-full h-[85vh] rounded-xl shadow-2xl bg-white" />
                        ) : (
                            <img src={previewUrl} alt="PO Preview" className="w-full h-full object-contain rounded-xl shadow-2xl" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
