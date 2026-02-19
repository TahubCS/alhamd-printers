import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils'; // You might need to duplicate this or move to a shared non-DOM utility file if it uses DOM

// Register font (optional, using standard fonts for now)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#112233',
        paddingBottom: 10,
    },
    companyInfo: {
        marginBottom: 10,
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#112233',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        flexDirection: 'column',
    },
    logo: {
        width: 60,
        height: 60,
        marginBottom: 10,
    },
    invoiceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    label: {
        color: '#666666',
        fontSize: 8,
        marginBottom: 2,
    },
    value: {
        marginBottom: 8,
    },
    table: {
        marginTop: 20,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 8,
    },
    colDesc: { width: '40%' },
    colSize: { width: '20%' },
    colQty: { width: '10%', textAlign: 'right' },
    colRate: { width: '15%', textAlign: 'right' },
    colAmount: { width: '15%', textAlign: 'right' },

    footer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    totalLabel: {
        width: 100,
        textAlign: 'right',
        paddingRight: 10,
        fontWeight: 'bold',
    },
    totalValue: {
        width: 100,
        textAlign: 'right',
    },
    finalTotal: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    terms: {
        marginTop: 30,
        fontSize: 8,
        color: '#666666',
    }
});

interface InvoicePDFProps {
    invoice: any; // Using any for minimal setup, robust types should be used later
    company: any;
}

const InvoicePDF = ({ invoice, company }: InvoicePDFProps) => {
    const customer = invoice.customer || {};
    const items = invoice.items || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.row}>
                        <View style={styles.column}>
                            {company.logoUrl && (
                                // eslint-disable-next-line jsx-a11y/alt-text
                                <Image src={company.logoUrl} style={styles.logo} />
                            )}
                            <Text style={styles.companyName}>{company.name || 'Company Name'}</Text>
                            <Text>{company.address}</Text>
                            <Text>{company.phone}</Text>
                            <Text>{company.email}</Text>
                            {company.website && <Text>{company.website}</Text>}
                        </View>
                        <View style={[styles.column, { alignItems: 'flex-end' }]}>
                            <Text style={styles.invoiceTitle}>INVOICE</Text>
                            <Text style={styles.value}>#{invoice.invoiceNumber}</Text>

                            <Text style={styles.label}>Date</Text>
                            <Text style={styles.value}>{new Date(invoice.date).toLocaleDateString()}</Text>

                            <Text style={styles.label}>Due Date</Text>
                            <Text style={styles.value}>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Bill To Section */}
                <View style={styles.row}>
                    <View style={styles.column}>
                        <Text style={[styles.label, { fontSize: 10, fontWeight: 'bold', marginBottom: 5 }]}>Bill To:</Text>
                        <Text style={{ fontWeight: 'bold' }}>{customer.name}</Text>
                        <Text>{customer.address}</Text>
                        <Text>{customer.phone}</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Description</Text>
                        <Text style={styles.colSize}>Size</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colRate}>Rate</Text>
                        <Text style={styles.colAmount}>Amount</Text>
                    </View>

                    {/* Rows */}
                    {items.map((item: any, index: number) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colSize}>
                                {item.sizeWidth ? `${Number(item.sizeWidth)}x${Number(item.sizeLength)}` : '-'}
                                {item.sizeDepth ? ` / ${Number(item.sizeDepth)}` : ''}
                            </Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colRate}>{Number(item.rate).toFixed(2)}</Text>
                            <Text style={styles.colAmount}>{Number(item.amount).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals Section */}
                <View style={styles.footer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
                    </View>

                    {/* Tax / GST - Displayed as accumulated total */}
                    {Number(invoice.taxTotal) > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>GST / Tax</Text>
                            <Text style={styles.totalValue}>{formatCurrency(invoice.taxTotal)}</Text>
                        </View>
                    )}

                    <View style={[styles.totalRow, { marginTop: 4 }]}>
                        <Text style={[styles.totalLabel, styles.finalTotal]}>Total</Text>
                        <Text style={[styles.totalValue, styles.finalTotal]}>{formatCurrency(invoice.total)}</Text>
                    </View>
                </View>

                {/* Footer/Terms */}
                <View style={styles.terms}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Terms & Conditions:</Text>
                    <Text>1. Goods once sold will not be taken back.</Text>
                    <Text>2. Payment should be made by crossed cheque in favor of {company.name}.</Text>
                    <Text style={{ marginTop: 20, textAlign: 'center' }}>Thank you for your business!</Text>
                </View>

            </Page>
        </Document>
    );
};

export default InvoicePDF;
