# ExpenseMate

A full-stack personal finance tracker. Log income and expenses in multiple currencies, set monthly category budgets, view reports, and move your data in and out with CSV and backup files.

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

---

## Introduction

ExpenseMate is a client-server web application. A React single-page app talks to an Express REST API, and the API stores everything in PostgreSQL. Each user has their own account, and one user can never see or change another user's data.

---

## Screenshots

| Dashboard | Transactions |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.jpeg) | ![Transactions](docs/screenshots/transactions.jpeg) |

| Monthly report | Budgets |
|---|---|
| ![Monthly report](docs/screenshots/report.jpeg) | ![Budgets](docs/screenshots/budgets.jpeg) |

---

## Features

- **Accounts:** sign up, log in and log out. Passwords are hashed with bcrypt and sessions are stored in PostgreSQL.
- **Transactions:** add, edit and delete income and expense entries with amount, category, description, date and currency.
- **Multi-currency:** PKR, USD, EUR, GBP and AED. Every total is converted into the user's chosen base currency.
- **Dashboard:** current balance, total income, total expense, percentage of income spent, recent transactions, a spending chart and budget alerts.
- **Budgets:** set a monthly budget per category. Status is OK below 80%, Warning from 80%, and Exceeded at 100% or more.
- **Monthly report:** pick a month to see income, expenses, a category breakdown and an income-vs-expense trend. A month with no data shows an empty state.
- **CSV import and export:** import transactions from a CSV (invalid rows are skipped and reported with their row number) and export all transactions to CSV.
- **Backup and restore:** export transactions and budgets to a backup file and restore them later. Malformed records are rejected.
- **Settings:** update your profile name and base currency.
- **Interface:** responsive layout, toast notifications and GSAP animations.

---

## Tech Stack

| Area | Technology |
|---|---|
| Client | React 19, TypeScript, Vite, React Router 7 |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI |
| Charts and animation | Recharts, GSAP (`@gsap/react`, ScrollTrigger) |
| Dates and icons | date-fns, react-day-picker, Lucide React |
| Notifications | Sonner |
| Server | Node.js, Express 4, TypeScript |
| Auth and sessions | express-session, connect-pg-simple, bcryptjs |
| Database | PostgreSQL (`pg`) |
| Testing | Vitest |
| Code quality | ESLint, cyclomatic complexity check (threshold 8) |

---

## Project Structure

```
ExpenseMate/
├── src/                        # React client
│   ├── app/                    # Pages: Dashboard, Transactions, AddTransaction,
│   │                           #        Report, Budget, Settings, Login, Signup
│   ├── components/             # StatCard, TransactionTable, BalanceCard,
│   │   └── ui/                 #        BudgetAlert, shadcn/ui primitives
│   └── lib/                    # api.ts, currency.ts, AuthContext, useTransactions,
│                               # useDashboardData, useDashboardAnimations
├── server/
│   └── src/
│       ├── index.ts            # Express app, session and route setup
│       ├── routes/             # auth, transactions, budgets, currencies,
│       │                       # analytics, backup
│       ├── middleware/         # requireAuth
│       ├── db/                 # schema.sql, migrate.ts, pool.ts
│       ├── utils/              # budgetStatus, csv, backupValidation
│       └── integration/        # API integration tests
└── README.md
```

---

## API Overview

All routes except sign up and log in require a logged-in session.

| Route | Purpose |
|---|---|
| `/api/auth` | Sign up, log in, log out, current user, profile |
| `/api/transactions` | Transaction CRUD, CSV import, CSV export |
| `/api/budgets` | Create, update, list and delete budgets with their status |
| `/api/currencies` | List supported currencies |
| `/api/analytics` | Category breakdown and spending trend |
| `/api/backup` | Backup export and restore |
| `/api/health` | Health check |

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- PostgreSQL

### 1. Clone

```bash
git clone <repository-url>
cd ExpenseMate
```

### 2. Database and server

```bash
createdb expensemate

cd server
cp .env.example .env     # set DATABASE_URL and SESSION_SECRET
npm install
npm run migrate          # creates the tables and loads the currencies
npm run dev              # API on http://localhost:4000
```

### 3. Client

In a second terminal, from the project root:

```bash
cp .env.example .env     # VITE_API_URL defaults to http://localhost:4000/api
npm install
npm run dev              # app on http://localhost:5173
```

Open `http://localhost:5173/signup` to create an account.

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `PORT` | server | API port (default 4000) |
| `DATABASE_URL` | server | PostgreSQL connection string |
| `SESSION_SECRET` | server | Long random string used to sign session cookies |
| `CLIENT_ORIGIN` | server | Client URL allowed by CORS (default `http://localhost:5173`) |
| `NODE_ENV` | server | `production` makes the session cookie HTTPS-only |
| `VITE_API_URL` | client | Base URL of the API |

---

## Scripts

| Command | Where | Description |
|---|---|---|
| `npm run dev` | root | Start the client |
| `npm run build` | root | Type-check and build the client |
| `npm test` | root | Run the frontend unit tests |
| `npm run lint` | root | Run ESLint |
| `npm run complexity` | root | List functions with cyclomatic complexity above 8 |
| `npm run dev` | server | Start the API with auto-reload |
| `npm run migrate` | server | Create the database tables |
| `npm test` | server | Run the backend unit tests |
| `npm run test:integration` | server | Run the API integration tests |

Integration tests use a separate database whose name must end in `_test`.

---

## Testing

| Suite | Test cases |
|---|---|
| Backend unit tests | 27 |
| Frontend unit tests | 15 |
| Integration tests | 23 |

---

## Contributors

- [Uzair-Aslam-Dev](https://github.com/Uzair-Aslam-Dev)
- [saadnaeem24-3074](https://github.com/saadnaeem24-3074)
