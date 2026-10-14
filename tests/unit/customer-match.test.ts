import { describe, expect, it } from "vitest";
import { matchCustomer, normalizeName, type CustomerCandidate } from "@/lib/ai/customer-match";

const customer = (id: string, fields: Partial<CustomerCandidate>): CustomerCandidate => ({
    id,
    name: id,
    nameUrdu: null,
    phone: null,
    email: null,
    ntn: null,
    gstNumber: null,
    ...fields,
});

const customers = [
    customer("bluebird", { name: "Bluebird Apparel (Pvt.) Ltd.", ntn: "1234567-8", phone: "0300-1234567" }),
    customer("royal", { name: "Royal Knitwear", email: "accounts@royal.example", gstNumber: "32-77-8761-234-56" }),
    customer("star-a", { name: "Star Industries" }),
    customer("star-b", { name: "Star Enterprises" }),
];

describe("normalizeName", () => {
    it("ignores legal suffixes, case and punctuation", () => {
        expect(normalizeName("Bluebird Apparel (Pvt.) Ltd.")).toBe("bluebird apparel");
        expect(normalizeName("BLUEBIRD APPAREL PRIVATE LIMITED")).toBe("bluebird apparel");
    });
});

describe("matchCustomer", () => {
    it("prefers the tax number over a different name", () => {
        expect(matchCustomer({ name: "Some Other Name", ntn: "NTN 1234567 8" }, customers)).toMatchObject({ id: "bluebird", reason: "ntn" });
    });

    it("matches STRN and email exactly", () => {
        expect(matchCustomer({ gstNumber: "3277876123456" }, customers)).toMatchObject({ id: "royal", reason: "gstNumber" });
        expect(matchCustomer({ email: "Accounts@Royal.example" }, customers)).toMatchObject({ id: "royal", reason: "email" });
    });

    it("matches a name written differently", () => {
        expect(matchCustomer({ name: "BLUEBIRD APPAREL PVT LTD" }, customers)).toMatchObject({ id: "bluebird", reason: "name" });
        expect(matchCustomer({ name: "Royal Knitwear Lahore" }, customers)).toMatchObject({ id: "royal", reason: "similarName" });
    });

    it("matches a phone number in another format", () => {
        expect(matchCustomer({ name: "BB Apparel", phone: "+92 300 1234567" }, customers)).toMatchObject({ id: "bluebird", reason: "phone" });
    });

    it("refuses to guess between two equally likely customers", () => {
        expect(matchCustomer({ name: "Star" }, customers)).toBeNull();
    });

    it("returns null when nothing is close", () => {
        expect(matchCustomer({ name: "Crescent Textiles" }, customers)).toBeNull();
    });
});

describe("matchCustomer with learned names", () => {
    const aliases = [{ normalizedName: "bb apparel karachi", customerId: "bluebird" }];

    it("uses a name staff confirmed before", () => {
        expect(matchCustomer({ name: "BB Apparel, Karachi (Pvt) Ltd" }, customers, aliases)).toMatchObject({ id: "bluebird", reason: "learned" });
    });

    it("lets a tax number for another customer override the learned name", () => {
        const royal = customers.map((c) => (c.id === "royal" ? { ...c, ntn: "7654321-0" } : c));
        expect(matchCustomer({ name: "BB Apparel Karachi", ntn: "7654321-0" }, royal, aliases)).toMatchObject({ id: "royal", reason: "ntn" });
    });

    it("ignores a learned name whose customer no longer exists", () => {
        expect(matchCustomer({ name: "BB Apparel Karachi" }, customers, [{ normalizedName: "bb apparel karachi", customerId: "deleted" }])).toBeNull();
    });
});
