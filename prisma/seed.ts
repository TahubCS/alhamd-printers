/**
 * Demo data for local development and the public portfolio deployment.
 *
 * Every person, company, phone number and amount here is fictional. The seed
 * only runs against an empty database (no customers), so it can never mix demo
 * records into a real business database. To rebuild a demo database from
 * scratch run `npx prisma migrate reset`, which drops everything first.
 *
 * Records are written with the same ledger, balance and status rules the app
 * uses, so customer and supplier balances reconcile with their statements.
 */
import "dotenv/config";
import { PrismaClient, type Customer, type Prisma, type Product, type RawMaterial } from "@prisma/client";
import { addDays, calculateDocumentTotals, derivePOStatus, roundMoney } from "../src/lib/finance";
import { syncInvoiceStatuses } from "../src/lib/invoice-status";

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

// Deterministic pseudo-random numbers so every seeded demo looks the same
let state = 20261014;
function random() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
}
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => Math.round(min + random() * (max - min));

const today = new Date();
today.setHours(11, 0, 0, 0);
const daysAgo = (n: number) => addDays(today, -n);

const COMPANIES = [
    { id: "alhamd-printers", name: "Al-Hamd Printers", nameUrdu: "الحمد پرنٹرز", isDefault: true },
    { id: "ats", name: "ATS", nameUrdu: "اے ٹی ایس", isDefault: false },
    { id: "ma-enterprises", name: "M.A Enterprises", nameUrdu: "ایم اے انٹرپرائزز", isDefault: false },
];

const CUSTOMERS = [
    { name: "Crescent Garments", nameUrdu: "کریسنٹ گارمنٹس", creditLimit: 500000 },
    { name: "Bluebird Apparel", nameUrdu: "بلیو برڈ ملبوسات", creditLimit: 300000 },
    { name: "Sapphire Hosiery", nameUrdu: "سفائر ہوزری", creditLimit: 250000 },
    { name: "Indus Shirts Co.", nameUrdu: "انڈس شرٹس", creditLimit: 400000 },
    { name: "Noor Textiles", nameUrdu: "نور ٹیکسٹائل", creditLimit: 150000 },
    { name: "Royal Knitwear", nameUrdu: "رائل نٹ ویئر", creditLimit: 200000 },
    { name: "Green Leaf Uniforms", nameUrdu: "گرین لیف یونیفارمز", creditLimit: 100000 },
    { name: "Star Fashion House", nameUrdu: "اسٹار فیشن ہاؤس", creditLimit: 120000 },
];

const PRODUCTS = [
    { code: "SC-825", name: "Stripe White 12x18", nameUrdu: "سفید دھاری", thickness: "9MM", basePrice: 12.5 },
    { code: "SC-830", name: "Super Clear 14x20", nameUrdu: "سپر کلیئر", thickness: "1MM", basePrice: 15 },
    { code: "SC-840", name: "Super Clear with Tape 10x14", nameUrdu: "سپر کلیئر ٹیپ", thickness: "9MM", withTape: true, basePrice: 11 },
    { code: "PR-210", name: "Printed Shirt Bag 12x16", nameUrdu: "پرنٹ شدہ شرٹ بیگ", thickness: "1MM", withPrint: true, basePrice: 18 },
    { code: "MT-150", name: "Matt Hanger Bag 16x24", nameUrdu: "میٹ ہینگر بیگ", thickness: "1.2MM", basePrice: 22 },
    { code: "ZP-100", name: "Zipper Pouch 8x10", nameUrdu: "زپ پاؤچ", thickness: "1MM", basePrice: 9.5 },
];

const MATERIALS = [
    { name: "PVC Roll 0.9mm Super Clear", type: "ROLL", quantity: 42, min: 15, attributes: { thickness: "0.9", quality: "Super Clear" } },
    { name: "PVC Roll 1.0mm Imported", type: "ROLL", quantity: 8, min: 10, attributes: { thickness: "1.0", quality: "Imported" } },
    { name: "PVC Roll 1.2mm Matt", type: "ROLL", quantity: 12, min: 6, attributes: { thickness: "1.2", quality: "Matt" } },
    { name: "Plastic Hanger 14in", type: "HANGER", quantity: 3200, min: 1000, attributes: { size: "14in" } },
    { name: "Snap Button 12mm", type: "BUTTON", quantity: 650, min: 2000, attributes: { size: "12mm" } },
    { name: "Packing Tape 2in", type: "TAPE", quantity: 0, min: 24, attributes: { details: "Clear, 100 yards" } },
] as const;

const SUPPLIERS = [
    { name: "Karachi Polymer House", nameUrdu: "کراچی پولیمر ہاؤس" },
    { name: "Metro Hanger Works", nameUrdu: "میٹرو ہینگر ورکس" },
    { name: "City Packaging Supplies", nameUrdu: "سٹی پیکجنگ سپلائیز" },
];

const EXPENSES = ["Electricity bill", "Diesel for generator", "Factory rent", "Machine repair", "Courier charges", "Tea and refreshments", "Ink and solvents", "Internet and phone"];
const WORKERS = ["Imran Ali", "Bilal Ahmed", "Kashif Khan", "Usman Raza", "Faisal Iqbal"];

async function postInvoice(tx: Tx, input: {
    companyId: string;
    customerId: string;
    date: Date;
    creditDays: number;
    customerPurchaseOrderId?: string;
    items: { productId?: string; description: string; quantity: number; rate: number; gstRate?: number }[];
}) {
    const totals = calculateDocumentTotals(input.items);
    const invoice = await tx.invoice.create({
        data: {
            companyId: input.companyId,
            customerId: input.customerId,
            date: input.date,
            creditDays: input.creditDays,
            dueDate: addDays(input.date, input.creditDays),
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            customerPurchaseOrderId: input.customerPurchaseOrderId,
            items: {
                create: input.items.map((item, i) => ({ ...item, gstRate: item.gstRate ?? 0, amount: totals.lines[i].amount })),
            },
        },
    });
    const customer = await tx.customer.update({ where: { id: input.customerId }, data: { balance: { increment: totals.total } } });
    await tx.ledgerEntry.create({
        data: { date: input.date, customerId: input.customerId, invoiceId: invoice.id, particulars: `Invoice #${invoice.invoiceNo}`, debit: totals.total, balance: customer.balance },
    });
    return invoice;
}

async function postPayment(tx: Tx, input: { customerId: string; amount: number; date: Date; method: "CASH" | "CHEQUE" | "BANK_TRANSFER"; bankAccountId?: string; cheque?: { no: string; bank: string; status: "RECEIVED" | "DEPOSITED" | "CLEARED" } }) {
    const cheque = input.cheque
        ? await tx.cheque.create({
            data: {
                chequeNo: input.cheque.no,
                bankName: input.cheque.bank,
                amount: input.amount,
                chequeDate: addDays(input.date, 3),
                receivedDate: input.date,
                depositDate: input.cheque.status !== "RECEIVED" ? addDays(input.date, 4) : null,
                clearDate: input.cheque.status === "CLEARED" ? addDays(input.date, 6) : null,
                status: input.cheque.status,
                customerId: input.customerId,
            },
        })
        : null;
    const payment = await tx.payment.create({
        data: { customerId: input.customerId, amount: input.amount, method: input.method, date: input.date, chequeId: cheque?.id, bankAccountId: input.bankAccountId },
    });
    const customer = await tx.customer.update({ where: { id: input.customerId }, data: { balance: { decrement: input.amount } } });
    const label = input.method === "CHEQUE" ? `Cheque #${input.cheque!.no}` : input.method === "BANK_TRANSFER" ? "Bank Transfer" : "Cash";
    await tx.ledgerEntry.create({
        data: { date: input.date, customerId: input.customerId, paymentId: payment.id, particulars: `Payment received (${label})`, credit: input.amount, balance: customer.balance },
    });
}

async function main() {
    const existingCustomers = await prisma.customer.count();
    if (existingCustomers > 0) {
        console.log(`Database already has ${existingCustomers} customers. Demo data was NOT added.`);
        console.log("To rebuild a demo database from scratch, run: npx prisma migrate reset");
        return;
    }

    console.log("Seeding fictional demo data...");

    await prisma.$transaction(async (tx) => {
        for (const company of COMPANIES) {
            await tx.company.upsert({
                where: { id: company.id },
                update: {},
                create: { ...company, address: "Industrial Area, Karachi", phone: "021-0000000", email: company.isDefault ? "billing@example.com" : null },
            });
        }

        const banks = await Promise.all([
            tx.bankAccount.create({ data: { bankName: "Demo Bank", accountTitle: "Al-Hamd Printers", accountNumberMasked: "****1234" } }),
            tx.bankAccount.create({ data: { bankName: "Sample Islamic Bank", accountTitle: "Al-Hamd Printers", accountNumberMasked: "****5678" } }),
        ]);

        const products: Product[] = [];
        for (const p of PRODUCTS) {
            products.push(await tx.product.create({ data: { ...p, description: "Demo product", buttonPrice: 1 } }));
        }

        const customers: Customer[] = [];
        for (const [i, c] of CUSTOMERS.entries()) {
            customers.push(await tx.customer.create({
                data: { ...c, phone: `0300-00000${String(i + 10)}`, address: "Karachi", email: `accounts${i + 1}@example.com` },
            }));
        }

        const materials: RawMaterial[] = [];
        for (const m of MATERIALS) {
            materials.push(await tx.rawMaterial.create({
                data: {
                    name: m.name,
                    type: m.type,
                    attributes: m.attributes,
                    quantity: m.quantity,
                    minimumStockLevel: m.min,
                    transactions: { create: { type: "IN", quantity: m.quantity, notes: "Opening stock", date: daysAgo(180) } },
                },
            }));
        }

        // Customer purchase orders, partly invoiced and delivered
        const poCustomers = customers.slice(0, 4);
        for (const [i, customer] of poCustomers.entries()) {
            const lines = [pick(products), pick(products)].map((product) => ({ product, quantity: between(10, 40) * 100 }));
            const totals = calculateDocumentTotals(lines.map((l) => ({ quantity: l.quantity, rate: Number(l.product.basePrice), gstRate: 18 })));
            const po = await tx.customerPurchaseOrder.create({
                data: {
                    customerId: customer.id,
                    poNumber: `PO-${4100 + i}`,
                    date: daysAgo(40 - i * 8),
                    subtotal: totals.subtotal,
                    taxTotal: totals.taxTotal,
                    totalAmount: totals.total,
                    status: "OPEN",
                    items: {
                        create: lines.map((l, j) => ({
                            description: l.product.name,
                            productId: l.product.id,
                            quantity: l.quantity,
                            rate: l.product.basePrice,
                            gstRate: 18,
                            amount: totals.lines[j].amount,
                        })),
                    },
                },
                include: { items: true },
            });

            if (i < 3) {
                // Deliver and invoice the first line (or everything for the first PO)
                const delivered = i === 0 ? po.items : po.items.slice(0, 1);
                await tx.deliveryChallan.create({
                    data: {
                        customerId: customer.id,
                        customerPurchaseOrderId: po.id,
                        poNumber: po.poNumber,
                        date: addDays(po.date, 5),
                        vehicleNo: `KHI-${between(1000, 9999)}`,
                        driverName: pick(["Aslam", "Naveed", "Shahid"]),
                        items: { create: delivered.map((item) => ({ description: item.description, quantity: item.quantity, customerPurchaseOrderItemId: item.id })) },
                    },
                });
                await postInvoice(tx, {
                    companyId: "alhamd-printers",
                    customerId: customer.id,
                    date: addDays(po.date, 6),
                    creditDays: 30,
                    customerPurchaseOrderId: po.id,
                    items: delivered.map((item) => ({ productId: item.productId ?? undefined, description: item.description, quantity: item.quantity, rate: Number(item.rate), gstRate: 18 })),
                });
                const invoiced = await tx.invoice.aggregate({ where: { customerPurchaseOrderId: po.id }, _sum: { total: true } });
                await tx.customerPurchaseOrder.update({ where: { id: po.id }, data: { status: derivePOStatus(Number(invoiced._sum.total ?? 0), totals.total) } });
            }
        }

        // Six months of regular invoices and payments
        for (let day = 175; day >= 2; day -= between(4, 9)) {
            const customer = pick(customers);
            const items = Array.from({ length: between(1, 3) }, () => {
                const product = pick(products);
                return { productId: product.id, description: product.name, quantity: between(5, 30) * 100, rate: Number(product.basePrice), gstRate: pick([0, 0, 18]) };
            });
            await postInvoice(tx, { companyId: pick(["alhamd-printers", "alhamd-printers", "ats", "ma-enterprises"]), customerId: customer.id, date: daysAgo(day), creditDays: pick([15, 30, 45]), items });
        }

        // Customers pay most of what they owe; a few fall behind
        for (const [i, customer] of customers.entries()) {
            const { balance } = await tx.customer.findUniqueOrThrow({ where: { id: customer.id } });
            const owed = Number(balance);
            const share = [0.9, 0.75, 1, 0.55, 0.8, 0.35, 1, 0.6][i];
            let remaining = roundMoney(owed * share);
            let n = 0;
            while (remaining > 1000) {
                const amount = n === 2 ? remaining : roundMoney(Math.min(remaining, Math.round((owed / 3) / 1000) * 1000 || remaining));
                const method = pick(["CASH", "CHEQUE", "BANK_TRANSFER"] as const);
                await postPayment(tx, {
                    customerId: customer.id,
                    amount,
                    date: daysAgo(150 - n * 45 - i * 3),
                    method,
                    bankAccountId: method === "BANK_TRANSFER" ? banks[n % 2].id : undefined,
                    cheque: method === "CHEQUE" ? { no: String(between(100000, 999999)), bank: pick(["Demo Bank", "Sample Commercial Bank"]), status: "CLEARED" } : undefined,
                });
                remaining = roundMoney(remaining - amount);
                n += 1;
            }
        }

        // Recent cheques that are still in the clearing pipeline
        await postPayment(tx, { customerId: customers[1].id, amount: 45000, date: daysAgo(4), method: "CHEQUE", cheque: { no: "731402", bank: "Demo Bank", status: "RECEIVED" } });
        await postPayment(tx, { customerId: customers[3].id, amount: 60000, date: daysAgo(7), method: "CHEQUE", cheque: { no: "552918", bank: "Sample Commercial Bank", status: "DEPOSITED" } });

        // A slow payer with invoices past their due date, so the overdue views have content
        for (const day of [72, 58, 41]) {
            const product = products[day % products.length];
            await postInvoice(tx, {
                companyId: "alhamd-printers",
                customerId: customers[5].id,
                date: daysAgo(day),
                creditDays: 30,
                items: [{ productId: product.id, description: product.name, quantity: between(8, 20) * 100, rate: Number(product.basePrice) }],
            });
        }

        await tx.customer.update({ where: { id: customers[7].id }, data: { isBadDebt: true, notes: "Stopped responding; account on hold." } });
        for (const customer of customers) {
            await syncInvoiceStatuses(tx, customer.id);
        }

        // Suppliers: purchases received into stock, and payments against them
        for (const [i, s] of SUPPLIERS.entries()) {
            const supplier = await tx.supplier.create({ data: { ...s, phone: `021-000000${i + 1}`, address: "SITE Area, Karachi" } });
            const material = materials[[0, 3, 5][i]];
            const rate = [1450, 9, 85][i];
            const quantity = [20, 2000, 48][i];
            const received = [20, 2000, 24][i];
            const po = await tx.purchaseOrder.create({
                data: {
                    supplierId: supplier.id,
                    date: daysAgo(30 - i * 6),
                    total: roundMoney(quantity * rate),
                    status: received === quantity ? "RECEIVED" : "PARTIAL",
                    items: { create: { description: material.name, quantity, receivedQuantity: received, rate, amount: roundMoney(quantity * rate), materialId: material.id } },
                },
            });
            await tx.rawMaterial.update({
                where: { id: material.id },
                data: {
                    quantity: { increment: received },
                    transactions: { create: { type: "IN", quantity: received, date: addDays(po.date, 3), notes: `Received on purchase #${po.poNumber} from ${supplier.name}`, purchaseOrderId: po.id } },
                },
            });
            const value = roundMoney(received * rate);
            const paid = roundMoney(value * [0.5, 1, 0][i]);
            if (paid > 0) {
                await tx.supplierPayment.create({ data: { supplierId: supplier.id, amount: paid, method: "BANK_TRANSFER", date: addDays(po.date, 10), reference: `TRX-${between(10000, 99999)}` } });
            }
            await tx.supplier.update({ where: { id: supplier.id }, data: { balance: roundMoney(value - paid) } });
        }
        await tx.purchaseOrder.create({
            data: {
                supplierId: (await tx.supplier.findFirstOrThrow({ where: { name: SUPPLIERS[0].name } })).id,
                date: daysAgo(2),
                total: 15000,
                items: { create: { description: MATERIALS[1].name, quantity: 10, rate: 1500, amount: 15000, materialId: materials[1].id } },
            },
        });

        // Material used in production
        for (const material of materials.slice(0, 3)) {
            const used = Math.min(Number((await tx.rawMaterial.findUniqueOrThrow({ where: { id: material.id } })).quantity), between(3, 9));
            if (used <= 0) continue;
            await tx.rawMaterial.update({
                where: { id: material.id },
                data: { quantity: { decrement: used }, transactions: { create: { type: "OUT", quantity: used, date: daysAgo(between(1, 20)), notes: "Used in production" } } },
            });
        }

        // Expenses spread over six months
        for (let day = 178; day >= 1; day -= between(3, 8)) {
            await tx.expense.create({ data: { date: daysAgo(day), description: pick(EXPENSES), amount: between(8, 120) * 250 } });
        }

        // Workers with wages and advances
        for (const name of WORKERS) {
            const worker = await tx.worker.create({ data: { name, phone: "0311-0000000", weeklyWage: 9000 } });
            let balance = 0;
            const entries: Prisma.WagePaymentCreateManyInput[] = [];
            for (let week = 10; week >= 1; week--) {
                entries.push({ workerId: worker.id, type: "PAYMENT", amount: 9000, date: daysAgo(week * 7), notes: "Weekly wage" });
                balance += 9000;
                if (random() < 0.3) {
                    const advance = between(2, 8) * 1000;
                    entries.push({ workerId: worker.id, type: "ADVANCE", amount: advance, date: daysAgo(week * 7 - 2), notes: "Advance" });
                    balance -= advance;
                }
            }
            await tx.wagePayment.createMany({ data: entries });
            await tx.worker.update({ where: { id: worker.id }, data: { balance } });
        }
    }, { timeout: 120_000 });

    const [invoices, customers] = await Promise.all([prisma.invoice.count(), prisma.customer.count()]);
    console.log(`Done: ${customers} customers, ${invoices} invoices and related payments, stock, suppliers, expenses and wages.`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
