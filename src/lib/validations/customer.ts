import { z } from "zod";

export const CustomerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    nameUrdu: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    creditLimit: z.coerce.number().min(0, "Credit limit must be positive").optional(),
    openingBalance: z.coerce.number().optional(), // Only for new customers
    isBadDebt: z.boolean().default(false),
});

export type CustomerFormValues = z.infer<typeof CustomerSchema>;
