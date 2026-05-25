# OCM Report System Backend

Node.js / Express API for the OCM Report Management System frontend.

## Structure

```
src/
  config/          # env configuration
  db/              # MySQL pool, schema.sql, init + seed
  models/          # data access (SQL per entity)
  services/        # business logic
  controllers/     # HTTP handlers
  routes/          # Express routers
  middleware/      # auth, upload, errors
  realtime/        # socket.io server, events, notifier
  constants/       # report labels
  utils/           # formatting helpers
  app.js           # Express app
  server.js        # entry + bootstrap
```

## Setup

1. Copy `.env.example` to `.env` and set MySQL credentials.
2. Start MySQL (port 3306).
3. Install and run:

```bash
npm install
npm run dev
```

On first start the API creates database `ocm_report_system`, applies `src/db/schema.sql`, and seeds 20 sample reports.

## Default accounts

| Username     | Password     | Role        |
|-------------|--------------|-------------|
| admin       | admin        | admin       |
| superadmin  | superadmin   | superadmin  |
| member1     | password     | user        |
| any email   | password     | user (auto-created) |

## Frontend

Set in `ocm-report-system/.env`:

```
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

## API

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/reports`
- `GET /api/reports/stats/cycles`
- `GET /api/reports/:id`
- `POST /api/reports` (multipart: pdf, word)
- `PATCH /api/reports/:id/status`
- `POST /api/reports/:id/notes`
- `POST /api/reports/:id/resubmit-files`
- `GET /api/team-members`, `/api/departments`, `/api/general-directorates`

## Realtime (Socket.IO)

Endpoint: `ws://<host>:<port>/socket.io`

Auth: pass JWT via handshake `auth.token` (or `Authorization: Bearer <token>` header).

Rooms joined automatically based on JWT:
- `user:<id>` — submitter
- `department:<id>` — department members
- `admins` — admin + superadmin
- `superadmins` — superadmin only

Server events:
- `report:created`
- `report:updated`
- `report:status-changed`
- `report:note-added`
- `report:resubmitted`

Client example:

```js
import { io } from 'socket.io-client'
const socket = io('http://127.0.0.1:3000', {
  path: '/socket.io',
  auth: { token: '<jwt>' },
})
socket.on('report:created', (payload) => console.log(payload))
```
