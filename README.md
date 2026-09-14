# Linkroad TMS — Full-Stack Edition

A production-shaped Transportation Management System for Linkroad Logistics:
Node/Express REST API + PostgreSQL on the backend, a modular vanilla-JS
frontend that talks to it over `fetch`.

```
linkroad-tms/
├── backend/     Express API, PostgreSQL schema, JWT auth, tests
└── frontend/    Static HTML/CSS/JS — no build step required
```

## What's implemented

- **JWT authentication** with bcrypt password hashing (`backend/src/utils/auth.js`).
  First account to register becomes an Administrator; every account after that
  is created by an admin from the Users tab.
- **PostgreSQL schema** (`backend/sql/schema.sql`) — `users`, `customers`,
  `carriers`, `consignees`, `loads`, `invoices`, with foreign keys, indexes,
  and auto-incrementing load/invoice number sequences.
- **Full REST API** — CRUD for every entity, role-based access control
  (Administrator/Dispatcher/Accounting), input validation on every route,
  centralized error handling, rate-limited login.
- **Modular frontend** — `frontend/js/` is split by concern: `api.js` (the
  only file that calls `fetch`), `state.js` (client-side cache), one
  `render-*.js` per tab, `modals.js` (create/edit forms), `documents.js`
  (Rate Confirmation / BOL / Invoice / Settlement PDF generation via jsPDF).
- **69 backend integration tests** (`backend/test/`) running against
  [pg-mem](https://github.com/oguimbal/pg-mem), an in-memory Postgres engine —
  `npm test` needs no real database.

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit .env — at minimum set JWT_SECRET and your PG* values
```

You need a real PostgreSQL server for actual use (the in-memory engine is
test-only). Create the database, then:

```bash
createdb linkroad_tms        # or create it however you normally manage Postgres
npm run migrate              # applies sql/schema.sql + sql/triggers.sql
npm run seed                 # optional: creates admin/admin123 + one sample carrier/consignee/load
npm start                    # http://localhost:4000
```

Run the test suite any time (no database needed):

```bash
npm test
```

### 2. Frontend

The frontend is static files — serve them with anything. Two easy options:

```bash
cd frontend
npx serve .                  # or: python3 -m http.server 5173
```

Open the URL it gives you. If your backend isn't on `http://localhost:4000`,
edit `frontend/js/config.js`.

**CORS:** set `CORS_ORIGIN` in `backend/.env` to match wherever you serve the
frontend from (e.g. `http://localhost:5173`), or leave it as `*` for local
development only.

### 3. First login

- If you ran `npm run seed`: sign in with `admin` / `admin123` (change the
  password from the Users tab afterward).
- Otherwise: open the frontend, click **"Create the admin account"** on the
  login screen — the first registration is open, every one after it requires
  an existing admin.

## Security notes

- Passwords are hashed with bcrypt (12 salt rounds by default,
  `BCRYPT_SALT_ROUNDS` in `.env`) and never stored or logged in plain text.
- JWTs are signed with `JWT_SECRET` — **generate a real random value** for
  anything beyond local development:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- The frontend stores the JWT in `localStorage`. That's standard practice for
  this kind of app, but it does mean an XSS vulnerability could leak the
  token — don't add third-party scripts to `index.html` without vetting them.
- Login is rate-limited (20 attempts / 15 minutes per IP) to slow down
  brute-force attempts.

## Extending it

- **Carrier payment tracking** lives directly on `loads` (`carrier_pay_status`,
  `carrier_paid_date`) rather than a separate table — simplest fit for
  "did we pay the carrier for this load yet."
- Want a Postgres-backed session/refresh-token flow instead of a single
  long-lived JWT? Swap `JWT_EXPIRES_IN` down and add a `/api/auth/refresh`
  route — the auth utilities in `src/utils/auth.js` are already isolated
  for that.
- The frontend has no build step on purpose. If the project grows past a
  handful of files, consider bundling, but the current structure is meant
  to be readable and editable directly.
