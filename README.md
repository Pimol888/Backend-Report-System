# OCM Report Management Backend

Node.js + Express API for `ocm-report-management-system` frontend.

## Stack

- Express
- MySQL (`mysql2`)
- JWT auth
- Multer for PDF/Word uploads

## Setup

1) Install deps

```bash
npm install
```

2) Create `.env`

```bash
cp .env.example .env
```

3) Ensure MySQL is running

You can create the DB manually:

```sql
CREATE DATABASE IF NOT EXISTS ocm_report_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Or just start the server; it auto-creates DB and required table (`app_state`) using your MySQL credentials.

4) Run

```bash
npm run dev
```

Default API: `http://127.0.0.1:3000`

## Default login accounts

- `admin` / `admin`
- `superadmin` / `superadmin`

Any other username logs in as a dynamic `user` account with password `password` for local testing.

## API endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/reports`
- `GET /api/reports/stats/cycles`
- `GET /api/reports/:reportId`
- `POST /api/reports` (multipart fields: `pdf`, `word`)
- `PATCH /api/reports/:reportId/status` (admin/superadmin)
- `POST /api/reports/:reportId/notes` (admin/superadmin)
- `POST /api/reports/:reportId/resubmit-files` (user)
- `GET /api/reports/:reportId/files/:fileId`
- `GET /api/team-members`
- `GET /api/departments`
- `GET /api/general-directorates`
