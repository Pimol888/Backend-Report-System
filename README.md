# OCM Report Management — Backend

**Repository:** [github.com/Pimol888/Backend-Report-System](https://github.com/Pimol888/Backend-Report-System)

Express API intended for the **OCM Report Management System** Vue frontend (`ocm-report-management-system`). This service was bootstrapped from an internal **e-ticket** codebase, so many routes and tables still use **ticket** naming until report-specific modules are implemented.

## What this backend does today

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, password reset, role-based JWT (`user`, `admin`, `super_admin`)
- **Legacy ticket module:** `POST/GET/PUT /api/tickets`, admin ticket APIs, categories, uploads under `uploads/tickets/`
- **Shared features:** alerts, team alerts, meeting notes, calendar notes, permission requests, work logs, Socket.IO for admin notifications
- **Storage:** MySQL (recommended) or local JSON (`DB_DRIVER=file`, `data/db.json`)

## Frontend

Pair this API with the Vue app in the sibling folder:

`../ocm-report-management-system/ocm-report-system`

Use `VITE_API_BASE_URL` (or your app’s equivalent) pointing at this server’s origin (e.g. `http://127.0.0.1:3000`).

## Setup

1. Install dependencies

```bash
npm install
```

2. Environment

```bash
cp .env.example .env
```

3. MySQL (recommended)

In `.env` set:

- `DB_DRIVER=mysql`
- `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD`
- `MYSQL_DATABASE=ocm_report_system` (or any name you prefer; default in code matches `.env.example`)

Create the database if needed:

```sql
CREATE DATABASE ocm_report_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you already have data under the old default name, set `MYSQL_DATABASE=ticket_system` in `.env` instead of migrating.

Tables are created on first run when the app connects.

For a quick local demo without MySQL:

- `DB_DRIVER=file`

4. Run

```bash
npm run dev
```

Default URL: `http://127.0.0.1:3000` (see `PORT` and `HOST` in `.env`).

## Seed admin

On first boot, if no admin exists, one is created from:

- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD` (default `admin123`)

Use `POST /api/auth/login` with the same credentials (and the appropriate flow for admin vs user in `authController`) to obtain a JWT.

## API discovery

Open `GET /` on the running server for a JSON map of routes and access levels.

## Next steps for reports

- Add report CRUD (cycles: monthly / quarterly / semiannual / yearly, PDF + Word uploads, department scope)
- Optionally rename legacy `tickets` routes to `/api/reports` once the Vue app is wired to the new contract
- Keep `node_modules`, `.env`, and `uploads/*` out of Git (see `.gitignore`)
