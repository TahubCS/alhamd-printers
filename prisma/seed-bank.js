
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("\n🔒 SECURE BANK ACCOUNT SEEDING 🔒");
  console.log("=================================");
  console.log("This script allows you to securely add bank accounts to the system.");
  console.log("These details will be used in dropdowns for payment recording.");
  console.log("To stop adding accounts, just press ENTER when asked for Bank Name.\n");

  let count = 0;

  while (true) {
    const bankName = await ask(`\n[Account #${count + 1}] Bank Name (e.g. HBL): `);
    if (!bankName.trim()) break;

    const accountTitle = await ask(`[Account #${count + 1}] Account Title (e.g. Al-Hamd Printers): `);
    if (!accountTitle.trim()) {
        console.log("❌ Account Title is required. Skipping.");
        continue;
    }

    const accountMasked = await ask(`[Account #${count + 1}] Masked Number (e.g. ****1234): `);
    if (!accountMasked.trim()) {
        console.log("❌ Masked Number is required. Skipping.");
        continue;
    }

    try {
        await prisma.bankAccount.create({
            data: {
                bankName: bankName.trim(),
                accountTitle: accountTitle.trim(),
                accountNumberMasked: accountMasked.trim(),
                isActive: true
            }
        });
        console.log(`✅ Authorization successful: Added ${bankName} account.`);
        count++;
    } catch (error) {
        console.error("Error adding account:", error);
    }
  }

  console.log(`\n✨ Seeding complete! Added ${count} bank accounts.`);
  console.log("You can now close this window.");
  rl.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
