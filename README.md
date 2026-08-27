# Al-Hamd Printers Business Management

A bilingual operations application for a printing and packaging business. It replaces disconnected paper records and spreadsheets with one workspace for customer accounts, purchasing, invoicing, cheque clearance, raw-material inventory, expenses, and worker wages.

> This repository is a portfolio demonstration of a real-client management workflow. It contains no production credentials and the interface should only be demonstrated with anonymized or seeded data.

## The problem and solution

Small print operations need to connect orders and billing with stock, payments, expenses, and workforce advances. When each is tracked separately, balances and operational history become difficult to reconcile. This application provides focused ledgers and workflows around a shared PostgreSQL data model while retaining English and Urdu interfaces for day-to-day use.

## Major features

- Customer profiles, balances, credit limits, payment recording, and bad-debt status
- Purchase-order intake with item details and optional AI-assisted document extraction
- Invoice creation, payment status, print views, and PDF generation
- Cheque receipt, deposit, clearance, and bounce tracking
- Raw-material inventory with stock transactions and adjustments
- Expense entry, monthly filtering, and optional receipt extraction
- Worker profiles and wage, advance, deduction, and adjustment ledgers
- Responsive, keyboard-accessible navigation with route loading and error states
- English (LTR) and Urdu (RTL) copy, layout direction, forms, navigation, and data tables

No dashboard totals or performance claims are hard-coded: business figures are presented only where they come from configured application data.

## Technology

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **UI:** Tailwind CSS 4, shared UI primitives, Lucide icons
- **Data:** PostgreSQL, Prisma ORM and versioned migrations
- **Forms:** React Hook Form and Zod validation
- **Localization:** `next-intl` with locale-aware routing
- **Documents:** React PDF
- **Optional extraction:** Google Gemini API

## Architecture

```text
src/app/[locale]     Locale-scoped routes and route-level UI states
src/components       Feature components and shared layout/UI primitives
src/actions          Server actions for business operations
src/lib              Prisma client, validation, utilities, and AI adapters
src/messages         English and Urdu translation catalogs
src/i18n             Locale routing and request configuration
prisma               Data model, migrations, and development seed
```

Server actions own writes and revalidation, Prisma provides the persistence boundary, and feature components keep forms and tables close to their business domain. Locale is part of every application URL (`/en/...` or `/ur/...`); the locale layout sets `lang` and `dir` on the document.

## Local installation

### Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database intended for local development

```bash
git clone https://github.com/TahubCS/alhamd-printers.git
cd alhamd-printers
npm ci
cp .env.example .env
```

Fill in the local values described below, then prepare the database and start the app:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`; locale routing will direct the application to a supported language. Use the language control in the header to switch without losing the current section.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string consumed by Prisma |
| `GOOGLE_GEMINI_API_KEY` | No | Enables purchase-order and receipt image extraction |

Copy `.env.example` and use development-only values. Never commit `.env`, database exports, client documents, API keys, or production connection strings. Core manual entry workflows remain available without the optional AI key.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The repository currently has no automated test script. Add server-action unit tests and browser coverage for the critical invoice/payment, inventory, and RTL workflows before treating it as a production release.

## Bilingual and RTL support

English and Urdu message catalogs have matching business concepts. Urdu activates document-level RTL direction and an Urdu-appropriate font stack; direction-aware spacing and alignment are used for navigation and tables. When adding a feature, add both catalog entries and review it at mobile and desktop widths in both locales.

## Demo and screenshots

A safe demo can be created with `npx prisma db seed`. Screenshots are intentionally not stored until a fully anonymized demo database and repeatable capture workflow are available. Recommended portfolio captures are the dashboard, an empty-state list, an invoice form, and the same table in Urdu RTL—never use real names, phone numbers, addresses, documents, balances, or account details.

## Production readiness notes

This codebase supports real operational workflows but still requires deployment-specific security work: authentication and role-based authorization, backups and restore drills, audit logging, rate limiting, monitoring, a documented data-retention policy, and expanded automated testing. Review the optional AI provider's data-handling terms before submitting any client document.
