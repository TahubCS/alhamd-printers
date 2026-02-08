import { createInvoice } from "@/actions/invoice";
import { getCustomers } from "@/actions/customer";
import { getProducts } from "@/actions/product";
import { getCustomerPOById } from "@/actions/po";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Plus, Trash, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Types
interface Product {
    id: string;
    code: string;
    name: string;
    basePrice: number;
}

interface Customer {
    id: string;
    name: string;
    nameUrdu?: string | null;
}

interface InvoiceItem {
    productId?: string;
    description: string;
    quantity: number;
    sizeWidth?: number;
    sizeLength?: number;
    sizeDepth?: number;
    rate: number;
    amount: number;
}

export default function InvoiceForm() {
    const t = useTranslations("invoices.form");
    const tCommon = useTranslations("common");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromPoId = searchParams.get("fromPoId");
    const urlCustomerId = searchParams.get("customerId");

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [companyId, setCompanyId] = useState("alhamd-printers"); // Default
    const [customerId, setCustomerId] = useState(urlCustomerId || "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [creditDays, setCreditDays] = useState(0);
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "", quantity: 1, rate: 0, amount: 0 }
    ]);
    const [notes, setNotes] = useState("");

    // Data State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");

    // Load initial data
    useEffect(() => {
        getProducts().then(res => {
            if (res.success && res.data) {
                setProducts(res.data);
            }
        });

        // Initial customer load
        getCustomers().then(res => {
            if (res.success && res.data) {
                setCustomers(res.data);
            }
        });
    }, []);

    // PO Autofill Logic
    useEffect(() => {
        if (fromPoId) {
            getCustomerPOById(fromPoId).then(res => {
                if (res.success && res.data) {
                    const po = res.data;
                    if (po.customerId) setCustomerId(po.customerId);
                    // Pre-fill items from PO
                    if (po.items && po.items.length > 0) {
                        setItems(po.items.map((item: any) => ({
                            productId: item.productId,
                            description: item.description,
                            quantity: item.quantity,
                            rate: Number(item.rate),
                            amount: Number(item.amount)
                        })));
                    }
                    if (po.poNumber) {
                        setNotes((prev) => `${prev ? prev + '\n' : ''}PO #: ${po.poNumber}`);
                    }
                }
            });
        }
    }, [fromPoId]);

    // Search customers
    useEffect(() => {
        const timer = setTimeout(() => {
            getCustomers(customerSearch).then(res => {
                if (res.success && res.data) {
                    setCustomers(res.data);
                }
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    // Sync: When customer search matches a name exactly, select the ID
    useEffect(() => {
        const match = customers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase());
        if (match && match.id !== customerId) {
            setCustomerId(match.id);
        }
    }, [customerSearch, customers, customerId]);

    // Sync: When customer ID changes, update search text if it doesn't match
    useEffect(() => {
        if (customerId) {
            const customer = customers.find(c => c.id === customerId);
            if (customer && customer.name !== customerSearch) {
                setCustomerSearch(customer.name);
            }
        }
    }, [customerId, customers]);

    // Calculations
    const calculateAmount = (item: InvoiceItem) => {
        // Simple Qty * Rate for now. 
        // Logic for PVC bags (Weight calculation) can be added here if needed.
        return item.quantity * item.rate;
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = calculateAmount(newItems[index]);
        }

        // Auto-fill product details
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].description = product.name;
                newItems[index].rate = product.basePrice;
                newItems[index].amount = calculateAmount({ ...newItems[index], rate: product.basePrice });
            }
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId) {
            alert(t("selectCustomer"));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createInvoice({
                companyId,
                customerId,
                date: new Date(date),
                creditDays,
                items,
                notes,
                customerPurchaseOrderId: fromPoId || undefined
            });

            if (result.success) {
                router.push("/invoices");
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to create invoice");
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Header Fields */}
                    <div>
                        <Label className="text-[var(--color-text-secondary)]">{t("selectCompany")}</Label>
                        <select
                            className="input"
                            value={companyId}
                            onChange={e => setCompanyId(e.target.value)}
                        >
                            <option value="alhamd-printers">Al-Hamd Printers</option>
                            <option value="ats">ATS</option>
                            <option value="ma-enterprises">M.A Enterprises</option>
                            <option value="muhammad-tanveer">Muhammad Tanveer</option>
                        </select>
                    </div>

                    <div>
                        <Label>{t("selectCustomer")}</Label>
                        <div className="relative">
                            <Input
                                placeholder={t("selectCustomer")}
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                                list="customer-list"
                            />
                            <datalist id="customer-list">
                                {customers.map(c => (
                                    <option key={c.id} value={c.name}>{c.nameUrdu}</option>
                                ))}
                            </datalist>
                            {/* Fallback to select if ID needed, logic simplified for MVP - 
                               In real app, we'd use a proper ComboBox component calculating ID from selection 
                           */}
                            <select
                                className="input mt-2"
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                            >
                                <option value="">-- Select --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.nameUrdu ? `(${c.nameUrdu})` : ''}</option>
                                ))}
                            </select>
                            {customerId && (
                                <div className="mt-2 text-right">
                                    <span className="text-lg font-bold text-[var(--color-primary)]">
                                        {customers.find(c => c.id === customerId)?.nameUrdu}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>{t("billingDate")}</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>{t("creditDays")}</Label>
                        <Input
                            type="number"
                            value={creditDays}
                            onChange={e => setCreditDays(Number(e.target.value))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">{tCommon("items", { defaultMessage: "Items" })}</h3>
                            <Button type="button" onClick={addItem} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                {t("addItem")}
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-[var(--color-border)]">
                                        <th className="p-4 w-[200px] text-[var(--color-text-secondary)]">{t("selectProduct")} / {t("manualDescription")}</th>
                                        <th className="p-4 w-[80px] text-[var(--color-text-secondary)]">{t("quantity")}</th>
                                        <th className="p-4 w-[100px] text-[var(--color-text-secondary)]">{t("rate")}</th>
                                        <th className="p-4 w-[100px] text-right text-[var(--color-text-secondary)]">{tCommon("amount", { defaultMessage: "Amount" })}</th>
                                        <th className="p-4 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-b border-[var(--color-border)] last:border-0">
                                            <td className="p-4">
                                                <select
                                                    className="input h-8 text-xs p-1 mb-1"
                                                    value={item.productId || ""}
                                                    onChange={e => updateItem(index, 'productId', e.target.value)}
                                                >
                                                    <option value="">-- {t("manualDescription")} --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                                    ))}
                                                </select>
                                                <Input
                                                    value={item.description}
                                                    onChange={e => updateItem(index, 'description', e.target.value)}
                                                    placeholder="Description"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                                                    className="h-8"
                                                />
                                                {/* Size Fields (Hidden for simplicity in V1, uncomment if needed) */}
                                            </td>
                                            <td className="p-4">
                                                <Input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={e => updateItem(index, 'rate', Number(e.target.value))}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-4 text-right font-mono">
                                                {item.amount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                {items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-500"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="p-4 text-right font-bold text-lg">Total:</td>
                                        <td className="p-4 text-right font-bold text-lg">
                                            {total.toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    {tActions("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : tActions("save")}
                </Button>
            </div>
        </form>
    );
}
