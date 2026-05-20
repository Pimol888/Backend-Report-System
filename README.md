# Backend Report System (Express)

**Repository:** [github.com/Pimol888/Backend-Report-System](https://github.com/Pimol888/Backend-Report-System)

Express API for the OCM report frontend. This codebase is based on the same stack as the e-ticket project (MySQL/file DB, JWT auth, uploads, Socket.IO).

---

## Current scope (e-ticket template)

The copied e-ticket backend still exposes ticket APIs. Adapt routes and models for report submission (PDF/Word, cycles, department isolation) when you wire the Vue app.

Ticket backend where:

- **User**: can create a ticket **without authentication**
- **Admin**: can log in with **authentication** and view tickets (dashboard APIs)
- **Storage**: MySQL tables by default; set `DB_DRIVER=file` for local JSON (`data/db.json`)
- **Images**: stored locally in `uploads/` and served from `/uploads/*`

## Setup

1) Install dependencies

```bash
npm install
```

2) Create a `.env` file

```bash
cp .env.example .env
```

3) Configure MySQL (recommended)

Set these environment variables in `.env`:

- `DB_DRIVER=mysql`
- `MYSQL_HOST=127.0.0.1` (or `DB_HOST`)
- `MYSQL_PORT=3306` (or `DB_PORT`)
- `MYSQL_USER=root` (or `DB_USER`)
- `MYSQL_PASSWORD=your_password` (or `DB_PASSWORD`)
- `MYSQL_DATABASE=ticket_system` (or `DB_NAME`)
- `MYSQL_CONNECTION_LIMIT=10` (optional)

Create the database if it doesn't exist (tables are auto-created):

```sql
CREATE DATABASE ticket_system;
```

If you want the old file DB, set `DB_DRIVER=file`.


4) Start the server

```bash
npm run dev
```

Server runs on `http://localhost:3000` (or `PORT` from `.env`).

## Data fields for ticket creation

Fields (multipart/form-data):

- `name`
- `role`
- `department`
- `phoneNumber`
- `problem`
- `image` (file, optional)

## API

### Health

- `GET /health`

### Public (no auth)

- `POST /api/tickets` (multipart/form-data)

Example using curl:

```bash
curl -X POST "http://localhost:3000/api/tickets" \
  -F "name=John Doe" \
  -F "role=Employee" \
  -F "department=IT" \
  -F "phoneNumber=5551234" \
  -F "problem=My laptop is not working" \
  -F "image=@/path/to/image.png"
```

### Admin (JWT auth)

Seed admin is created on first run if no admin exists:

- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `admin123`)

Login:

- `POST /api/admin/login`
  - body: `{ "username": "admin", "password": "admin123" }`
  - returns: `{ "token": "..." }`

Then use the token:

- `GET /api/admin/tickets` (Authorization: `Bearer <token>`)
- `GET /api/admin/tickets/:id`
- `PATCH /api/admin/tickets/:id`
  - body: `{ "status": "open|in_progress|closed", "adminNote": "..." }`

