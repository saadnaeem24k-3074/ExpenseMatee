<h1 align="center">💰 Expense Tracker</h1>

<p align="center">
  A clean, animated personal finance tracker — log income and expenses, categorize spending,
  and see it all visualized on a dashboard and report page. Runs entirely in the browser.
</p>

<p align="center">
  <a href="https://expense-tracker-a77w.vercel.app/"><img src="https://img.shields.io/badge/LIVE%20DEMO-000000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <img src="https://img.shields.io/badge/REACT-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TYPESCRIPT-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## 📖 Introduction

Expense Tracker is a single-page React app for logging and understanding personal spending. Add income or expense transactions with a category, date, and description, and the app builds a live dashboard: current balance, income vs. expense totals, a transactions table, and a dedicated report page with monthly trend and category-breakdown charts.

> **Assignment 02 update:** this repository now includes the Express + PostgreSQL backend in `server/`. The client-only description in this README describes the Assignment 01 baseline; see **Running the Full Stack** below for the current setup.

---

## ✨ Key Features

- ➕ **Add transactions** — income or expense, with amount, category, description, and date (via a calendar date-picker)
- ✏️ **Edit transactions** — reopen any transaction pre-filled for editing
- 📊 **Dashboard** — current balance, total income, total expense, and a recent-transactions view at a glance
- 📈 **Reports** — monthly income vs. expense trend chart and a category breakdown (pie chart) for a selected month
- 🗂️ **Transaction list** — full sortable/browsable transaction history
- 💾 **Persistent storage** — all data saved to `localStorage`, so it survives page refreshes with no backend needed
- 🔔 **Toast notifications** — instant feedback on add/edit/delete via Sonner
- ✨ **Animated UI** — GSAP-powered entrance and scroll-triggered animations throughout
- 📱 **Responsive design** — Tailwind CSS v4 + shadcn/ui components

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Routing | React Router 7 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Charts | Recharts |
| Animation | GSAP (`@gsap/react`, ScrollTrigger) |
| Dates | date-fns, react-day-picker |
| Notifications | Sonner (toasts) |
| Icons | Lucide React |
| Data persistence | Browser `localStorage` (no backend/database) |
| Deployment | Vercel |

---

## 📁 Project Structure

```
Expense-Tracker/
├── src/
│   ├── app/
│   │   ├── Dashboard.tsx           # Home view — balance, totals, recent transactions, chart
│   │   ├── AddTransaction.tsx      # Add / edit transaction form
│   │   ├── Transactions.tsx        # Full transaction list
│   │   ├── Report.tsx              # Report page — monthly trend + category breakdown
│   │   ├── TransChart.tsx          # Dashboard chart component
│   │   ├── MonthlyTrack.tsx        # Income vs. expense bar chart
│   │   ├── MonthlyCategory.tsx     # Category breakdown pie chart
│   │   ├── RecentTransactions.tsx  # Recent transactions widget
│   │   └── Navbar.tsx              # Top navigation
│   ├── components/ui/              # shadcn/ui primitives (button, card, calendar, select, table...)
│   ├── lib/utils.ts                # `cn()` helper for Tailwind class merging
│   ├── App.tsx                     # Route definitions
│   └── main.tsx                    # App entry point
└── vite.config.ts
```

---

## 🧭 Routes

| Path | Page | Description |
|---|---|---|
| `/` | `Dashboard` | Balance overview, income/expense totals, recent transactions, chart |
| `/transactions` | `Transactions` | Full transaction history |
| `/addtransaction` | `AddTransaction` | Add a new transaction, or edit an existing one (passed via route state) |
| `/report` | `Report` | Monthly income/expense trend + category breakdown |

---

## 💻 How It Works

### Data Model

Each transaction is shaped as:

```ts
interface transactionn {
  id: string          // crypto.randomUUID()
  Amount: number
  Description: string
  Category: string
  Date: Date
  type: string         // "Income" | "Expense"
}
```

### Persistence

There's no API layer — transactions are read from and written straight to `localStorage` under the `transactions` key:

```ts
const [transaction, setTransaction] = useState<transactionn[]>(
  JSON.parse(localStorage.getItem('transactions') ?? "[]")
)
```

Any add, edit, or delete updates this state and re-serializes it back to `localStorage`, so the data is scoped to a single browser and persists across refreshes (but won't sync across devices).

### Editing a Transaction

Editing reuses the same `AddTransaction` form — the transaction to edit is passed through React Router's navigation state (`location.state?.editTrans`), which pre-fills the form fields and keeps the original transaction's `id` so saving overwrites rather than duplicates it.

### Charts

- **`MonthlyTrack`** — a Recharts bar chart comparing total income vs. total expense for the selected period
- **`MonthlyCategory`** — a Recharts pie chart breaking down expenses by category (salary, entertainment, shopping, utilities, others), with the largest category highlighted

---

## Running the Full Stack (Assignment 02)

The repository now contains the React client **and** an Express + PostgreSQL API
in `server/`. The client-only section that used to be here is superseded: the
backend is required for auth, transactions, budgets, analytics, CSV and cloud
backup.

### 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer running on `localhost:5432`
- Two databases: `expensemate` (app) and `expensemate_test` (integration tests;
  the test runner refuses a database whose name does not end in `_test`)

### 2. Install

```powershell
git clone https://github.com/saadnaeem24k-3074/ExpenseMatee.git
cd ExpenseMatee
npm install
npm run install:server
```

### 3. Configure

```powershell
Copy-Item server/.env.example server/.env
Copy-Item server/.env.example server/.env.test
```

Edit both files:

- `DATABASE_URL` — `postgres://USER:PASSWORD@localhost:5432/expensemate`
- `SESSION_SECRET` — 16+ random characters (`openssl rand -hex 32`)
- `NODE_ENV`, `PORT` (default `4001`), `CLIENT_ORIGIN` (default `http://localhost:5173`)
- `.env.test` must point at `expensemate_test`

### 4. Create the databases and migrate

```powershell
psql -U postgres -c "CREATE DATABASE expensemate;"
psql -U postgres -c "CREATE DATABASE expensemate_test;"
npm run migrate
npm run migrate   # second run must report both migrations as skipped
```

Optional data-safety check (creates and drops a scratch database):

```powershell
npm run verify:migration
```

### 5. Run the app

```powershell
npm run dev                    # client: http://localhost:5173
npm --prefix server run dev    # API:    http://localhost:4001
```

### 6. Tests and builds

```powershell
npm test                       # frontend (15 tests)
npm run test:server            # all server tests (139)
npm --prefix server run test:unit          # 93 unit tests
npm --prefix server run test:integration   # 46 integration tests (real DB)

npm run build                  # client production build
npm run build:server           # server TypeScript build
```

Coverage:

```powershell
npm run test:coverage         # server coverage report
```

Real results for this assignment are in `docs/test-results.md` and
`docs/metrics/comparison.md`.
---

## 🌐 Live Demo

**[expense-tracker-a77w.vercel.app](https://expense-tracker-a77w.vercel.app/)**

Deployed on Vercel with CI/CD — every push to `main` triggers an automatic rebuild and redeploy.

---

## 👤 Author

**Saad Naeem**
[GitHub](https://github.com/saadnaeem463) · [LinkedIn](https://www.linkedin.com/in/saad-naeem-5138a3409/)
