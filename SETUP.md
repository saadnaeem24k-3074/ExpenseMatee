# ExpenseMate — Backend & Auth Setup

This adds a Node/Express + PostgreSQL backend with cookie-session auth to the
existing React/TypeScript frontend. Nothing in the original UI/animations was
removed — every page now reads/writes through the API instead of `localStorage`.

## What changed

- **`server/`** — new Express API (signup, login, logout, me, transactions CRUD),
  using `express-session` + `connect-pg-simple` for cookie-based sessions and
  `bcryptjs` for password hashing.
- **`src/lib/api.ts`** — typed fetch client, sends cookies (`credentials: "include"`).
- **`src/lib/AuthContext.tsx`** — React context exposing `user`, `login`, `signup`, `logout`.
- **`src/lib/useTransactions.ts`** — replaces all `localStorage` reads/writes with API calls.
- **`src/app/Login.tsx`, `src/app/Signup.tsx`** — new auth pages.
- **`src/app/ProtectedRoute.tsx`** — redirects to `/login` if not authenticated.
- **`src/app/Navbar.tsx`** — now shows the logged-in user's name + a logout button.
- **`src/App.tsx`** — wraps the app in `AuthProvider`, adds `/login` & `/signup` routes,
  wraps existing routes in `ProtectedRoute`.

## 1. Database

You need a PostgreSQL database (local, Docker, or a hosted one like Supabase/Neon/Railway).

```bash
# Example with local Postgres:
createdb expensemate
```

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env — set DATABASE_URL to your Postgres connection string,
# and SESSION_SECRET to a long random string

npm install
npm run migrate   # creates users, transactions, and session tables
npm run dev       # starts the API on http://localhost:4000
```

## 3. Frontend setup

```bash
# from the project root
cp .env.example .env
# VITE_API_URL defaults to http://localhost:4000/api, adjust if needed

npm install
npm run dev        # starts the frontend on http://localhost:5173
```

Visit `http://localhost:5173/signup` to create an account, then you're in.

## 4. Deploying

- **Backend**: any Node host (Render, Railway, Fly.io). Set `DATABASE_URL`,
  `SESSION_SECRET`, `CLIENT_ORIGIN` (your deployed frontend URL), and
  `NODE_ENV=production` as env vars. In production the session cookie is set
  with `secure: true` and `sameSite: "none"`, so the backend **must** be served
  over HTTPS for cookies to work cross-site.
- **Frontend**: Vercel (as before). Set `VITE_API_URL` to your deployed backend's
  `/api` URL in the Vercel project's environment variables.
- Run `npm run migrate` once against your production database before first use.

## Notes / things you may want to tighten up later

- Session cookie lifetime is 7 days — adjust `cookie.maxAge` in `server/src/index.ts`.
- There's no rate-limiting or account lockout on login — worth adding
  (`express-rate-limit`) before going live publicly.
- No "forgot password" flow yet — happy to add it if you want.
