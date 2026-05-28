# OCM Report System Backend

Node.js / Express REST API + Socket.IO for the OCM Report Management System.

**Scope:** backend and database only. The Vue frontend is not wired to this API yet.

## Structure

```
src/
  config/          env (DB, JWT, host/port)
  db/              pool, schema.sql, init + seed
  models/          MySQL data access per table
  services/        business logic
  controllers/     HTTP handlers
  routes/          Express routers
  middleware/      auth, upload, errors
  realtime/        Socket.IO (events + notifier)
  constants/       report labels
  utils/           formatting, HttpError
  app.js           Express app
  server.js        HTTP server + Socket.IO
db/
  reportdb.sql     full dump for MySQL Workbench / teammates
scripts/
  init-db.js, reset-db.js, export-sql.js, import-sql.js, check-db.js
```

## Quick start

1. Copy `.env.example` → `.env` and set MySQL password.
2. Start MySQL on port 3306.
3. Initialize database:

```bash
npm install
npm run db:init
```

4. Run API:

```bash
npm run dev
```

API: `http://127.0.0.1:3000`  
Socket.IO: `ws://127.0.0.1:3000/socket.io` (JWT in `auth.token`)

## Database

| Command | Purpose |
|---|---|
| `npm run db:init` | Create DB, apply schema, seed if empty |
| `npm run db:reset` | Drop DB, recreate + seed (**destructive**) |
| `npm run db:export` | Write `db/<DB_NAME>.sql` (schema + data) |
| `npm run db:import` | Import `db/<DB_NAME>.sql` |
| `npm run db:check` | List tables, row counts, admin users |

**MySQL Workbench:** *File → Run SQL Script…* → `db/reportdb.sql`

## Roles

| Role | Meaning |
|---|---|
| `user` | Normal user (report submitter) |
| `admin` | Head of Department (department scope) |
| `orgadmin` | Director General (general directorate scope) |
| `superadmin` | Director General, Department of Assembly and General Affairs (national scope) |

## Default accounts

| Email | Password | Role |
|---|---|---|
| `admin` | `admin` | admin (Head of Department) |
| `orgadmin` | `orgadmin` | orgadmin (Director General) |
| `superadmin` | `superadmin` | superadmin (national) |
| `member1` … `member12` | `password` | user |
| any other email | `password` | user (auto-created on first login) |

## REST API

All JSON responses: `{ "success": true, "data": ... }`  
Auth: `Authorization: Bearer <token>` from `POST /api/auth/login`

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` |
| GET | `/api/auth/me` | any | current user |
| GET | `/api/reports` | any | query: `cycle`, `status`, `search`, `page`, `limit`, `sort`, `memberId`, `departmentId`, `generalDirectorateId` |
| GET | `/api/reports/stats/cycles` | any | counts by cycle |
| GET | `/api/reports/:reportId` | any | detail + `activityLogs` |
| GET | `/api/reports/:reportId/activity-logs` | any | audit trail only |
| POST | `/api/reports` | user+ | multipart: `pdf`, `word`; body: `title`, `cycle`, `reportDate`, optional `description`, `periodLabel` |
| PATCH | `/api/reports/:reportId/status` | admin, orgadmin, superadmin | `{ "status": "pending" \| "reviewed" }` |
| POST | `/api/reports/:reportId/notes` | admin, orgadmin, superadmin | `{ "text", "kind": "comment" \| "request-files" }` |
| POST | `/api/reports/:reportId/resubmit-files` | user | multipart: `pdf`, `word` |
| GET | `/api/reports/:reportId/files/:fileId` | any | file download |
| GET | `/api/team-members` | any | scoped by role |
| GET | `/api/departments` | any | |
| GET | `/api/general-directorates` | any | |

## Tables

- `general_directorates`, `departments`, `users`
- `reports`, `report_files`, `admin_notes`, `report_activity_logs`

## Socket.IO events

Emitted after create / status change / note / resubmit:

- `report:created`
- `report:status-changed`
- `report:note-added`
- `report:resubmitted`

Connect with JWT:

```js
const { io } = require("socket.io-client");
const socket = io("http://127.0.0.1:3000", {
  path: "/socket.io",
  auth: { token: "<jwt>" },
});
socket.on("report:created", (payload) => console.log(payload));
```

## Sharing schema/data with teammates

After changes in MySQL Workbench:

```bash
npm run db:export
git add db/reportdb.sql src/db/schema.sql
git commit && git push
```

Teammates: `git pull` → `npm run db:import` (or run `db/reportdb.sql` in Workbench).

After changes to `schema.sql` / `seedData.js` only:

```bash
npm run db:reset
npm run db:export   # optional: refresh dump
```
