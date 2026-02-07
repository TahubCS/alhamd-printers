import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Create the 4 companies
    const companies = await Promise.all([
        prisma.company.upsert({
            where: { id: 'alhamd-printers' },
            update: {},
            create: {
                id: 'alhamd-printers',
                name: 'Al-Hamd Printers',
                nameUrdu: 'الحمد پرنٹرز',
                address: 'Karachi, Pakistan',
                phone: '0345-8226924',
                email: 'm.tanweer1978@gmail.com',
                isDefault: true,
            },
        }),
        prisma.company.upsert({
            where: { id: 'ats' },
            update: {},
            create: {
                id: 'ats',
                name: 'ATS',
                nameUrdu: 'اے ٹی ایس',
                address: 'Karachi, Pakistan',
                isDefault: false,
            },
        }),
        prisma.company.upsert({
            where: { id: 'ma-enterprises' },
            update: {},
            create: {
                id: 'ma-enterprises',
                name: 'M.A Enterprises',
                nameUrdu: 'ایم اے انٹرپرائزز',
                address: 'Karachi, Pakistan',
                isDefault: false,
            },
        }),
        prisma.company.upsert({
            where: { id: 'muhammad-tanveer' },
            update: {},
            create: {
                id: 'muhammad-tanveer',
                name: 'Muhammad Tanveer',
                nameUrdu: 'محمد تنویر',
                address: 'Karachi, Pakistan',
                phone: '0345-8226924',
                isDefault: false,
            },
        }),
    ]);

    console.log(`✅ Created ${companies.length} companies`);

    // Create a sample customer for testing
    const sampleCustomer = await prisma.customer.upsert({
        where: { id: 'sample-customer' },
        update: {},
        create: {
            id: 'sample-customer',
            name: 'R.M Shersher',
            nameUrdu: 'آر ایم شیرشیر',
            phone: '0300-1234567',
            address: 'Karachi, Pakistan',
            balance: 0,
        },
    });

    console.log(`✅ Created sample customer: ${sampleCustomer.name}`);

    // Create a sample product
    const sampleProduct = await prisma.product.upsert({
        where: { code: 'SC-825' },
        update: {},
        create: {
            code: 'SC-825',
            name: 'Stripe White',
            nameUrdu: 'سفید دھاری',
            description: 'PVC polybag with stripe pattern',
            thickness: '9MM',
            withTape: false,
            withPrint: false,
            basePrice: 12.50,
            buttonPrice: 1.00,
        },
    });

    console.log(`✅ Created sample product: ${sampleProduct.name}`);

    console.log('🎉 Seed completed successfully!');
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
