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

There's no backend — everything is persisted client-side in **`localStorage`**, so the app works fully offline once loaded and needs no database or server to run.

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

## 🚀 Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/saadnaeem463/Expense-Tracker.git
cd Expense-Tracker

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev   # runs on http://localhost:5173
```

No environment variables or database setup needed — it just runs.

---

## 🌐 Live Demo

**[expense-tracker-a77w.vercel.app](https://expense-tracker-a77w.vercel.app/)**

Deployed on Vercel with CI/CD — every push to `main` triggers an automatic rebuild and redeploy.

---

## 👤 Author

**Saad Naeem**
[GitHub](https://github.com/saadnaeem463) · [LinkedIn](https://www.linkedin.com/in/saad-naeem-5138a3409/)
