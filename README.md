# Al-Hamd Printers Business Management

[![CI](https://github.com/TahubCS/alhamd-printers/actions/workflows/ci.yml/badge.svg)](https://github.com/TahubCS/alhamd-printers/actions/workflows/ci.yml)

A bilingual (English/Urdu) operations application for a printing and packaging business. It replaces disconnected paper records and spreadsheets with one workspace for customer accounts, customer orders and deliveries, invoicing, cheque clearance, raw-material purchasing and inventory, supplier payables, expenses, and worker wages.

> [!IMPORTANT]
> **Public demo and client deployment:** The version deployed on Vercel is a portfolio demonstration that uses seeded, fictional, or anonymized data. It is not connected to Al-Hamd Printers’ operational database. The application used for actual business operations runs locally for the client and stores real records in a privately managed PostgreSQL database. Real customer information, invoices, payments, inventory figures, expenses, employee records, documents, and analytics are not exposed through the public demo.

## The problem and solution

Small print operations need to connect orders and billing with stock, payments, expenses, and workforce advances. When each is tracked separately, balances and operational history become difficult to reconcile. This application provides focused ledgers and workflows around a shared PostgreSQL data model while retaining English and Urdu interfaces for day-to-day use.

## Major features

- **Dashboard** with live receivables, overdue invoices, cheques awaiting clearance, monthly sales and expenses, supplier payables, a six-month sales vs expenses chart, low-stock alerts and overdue follow-ups
- **Customers** with credit limits, opening balances, a running ledger, payments (cash, cheque, bank transfer) and bad-debt status
- **Customer purchase orders** entered by hand or extracted from a photo/PDF with optional AI, tracked through delivery and invoicing
- **Delivery challans** that pre-fill what is still left to deliver on a PO, with printable dispatch notes
- **Invoices** across several invoicing companies, with GST, PDF download, printing, and statuses (pending, partial, paid, overdue, bad debt) derived from the customer's balance
- **Cheques** through received, deposited, cleared or bounced; a bounce reverses the payment exactly once
- **Products** catalog of bag specifications and standard prices
- **Inventory** of raw materials with stock movements, corrections and low-stock alerts
- **Suppliers** with purchase orders, partial or full goods receiving straight into stock, payables and payments
- **Expenses** with monthly filtering and optional receipt scanning
- **Wages** with worker ledgers for wages, advances, deductions and adjustments
- **Settings** for invoicing companies (with logos) and deposit bank accounts (last four digits only)
- **Sign-in** protecting every page and server action
- English (LTR) and Urdu (RTL) throughout, responsive down to phone width, with print styles for invoices, challans and purchase orders

No dashboard totals or performance claims are hard-coded: every figure is computed from the database.

## Technology

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **UI:** Tailwind CSS 4, shared UI primitives, Lucide icons
- **Data:** PostgreSQL, Prisma ORM and versioned migrations
- **Forms:** React Hook Form and Zod validation
- **Localization:** `next-intl` with locale-aware routing
- **Documents:** React PDF
- **Optional extraction:** Google Gemini API
- **Testing:** Vitest unit tests and integration tests against PostgreSQL; GitHub Actions CI

## Architecture

```text
src/app/[locale]     Locale-scoped routes and route-level UI states
src/components       Feature components and shared layout/UI primitives
src/actions          Server actions for business operations
src/lib              Prisma client, pure finance rules, auth, validation, AI adapters
src/messages         English and Urdu translation catalogs
src/i18n             Locale routing and request configuration
prisma               Data model, migrations, and fictional demo seed
tests                Unit tests (pure rules) and integration tests (server actions + PostgreSQL)
```

Server actions own writes and revalidation, Prisma provides the persistence boundary, and feature components keep forms and tables close to their business domain. Money rules (document totals, GST, invoice status allocation, cheque transitions, stock and wage signs) live in `src/lib/finance.ts` as pure functions, and every balance change happens through atomic increments inside a transaction together with its ledger entry. Locale is part of every application URL (`/en/...` or `/ur/...`); the locale layout sets `lang` and `dir` on the document.

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
npx prisma migrate deploy
npx prisma db seed   # fictional demo data; skipped if the database already has customers
npm run dev
```

Open `http://localhost:3000` and sign in with `AUTH_USERNAME` / `AUTH_PASSWORD`. Use the language control in the header to switch between English and Urdu without losing the current section.

The seed only fills an **empty** database, so it can never mix demo records into real data. To rebuild a demo database from scratch, run `npx prisma migrate reset` (this deletes everything in the database it points at).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string consumed by Prisma |
| `AUTH_SECRET` | Yes | At least 32 random characters used to sign session cookies (`openssl rand -base64 48`) |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | Yes | The sign-in account |
| `DEMO_MODE` | No | `true` shows the demo account on the login page. Only for the public portfolio deployment |
| `GOOGLE_GEMINI_API_KEY` | No | Enables purchase-order and receipt image extraction |
| `TEST_DATABASE_URL` | No | Disposable database for integration tests. It is wiped on every test run |

Copy `.env.example` and use development-only values. Never commit `.env`, database exports, client documents, API keys, or production connection strings. Core manual entry workflows remain available without the optional AI key.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test        # unit tests; add TEST_DATABASE_URL to also run the integration tests
npm run build
```

Integration tests call the real server actions against a disposable PostgreSQL database (`TEST_DATABASE_URL`, migrated with `npx prisma migrate deploy`). They cover invoice totals and ledgers, payment allocation, concurrent payments, cheque bounces, invoice deletion, PO closing, delivery challans, supplier receiving, stock, wages, products and settings. They are skipped when `TEST_DATABASE_URL` is not set, so they can never touch the database in `.env`.

GitHub Actions runs lint, typecheck, a schema/migration drift check, the demo seed, all tests against a PostgreSQL service, and a production build on every push and pull request.

## Bilingual and RTL support

English and Urdu message catalogs contain exactly the same keys. Urdu activates document-level RTL direction and an Urdu-appropriate font stack; direction-aware spacing and alignment are used for navigation and tables. When adding a feature, add both catalog entries and review it at mobile and desktop widths in both locales.

## Public demo and data privacy

Visitors can explore the Vercel deployment to review the application's interface, bilingual workflows, and responsive behavior. Its records and figures are seeded, fictional, or anonymized demonstration content; they do not represent Al-Hamd Printers’ customers, finances, inventory, workforce, performance, or actual business operations.

The client’s operational installation runs locally and uses a privately managed PostgreSQL database that is separate from the public demo. Do not upload real client documents or enter real customer, payment, employee, or operational information into the Vercel deployment. Screenshots and other portfolio materials must likewise use demonstration data and must not expose private client records.

To set up the demo deployment: point `DATABASE_URL` at an empty demo database, run `npx prisma migrate deploy && npx prisma db seed`, and set `DEMO_MODE=true` with a throwaway `AUTH_USERNAME`/`AUTH_PASSWORD` so visitors can sign in. Never enable `DEMO_MODE` on the business installation.

## Production readiness notes

Already in place: sign-in on every page and server action, signed session cookies, server-side recomputation of every total, atomic balance updates, validated state transitions, automated tests and CI.

Still recommended for the business installation: per-user accounts and role-based permissions (the current login is a single shared account), scheduled database backups with restore drills, an audit log of who changed what, monitoring, and a documented data-retention policy. Review the optional AI provider's data-handling terms before submitting any client document.
