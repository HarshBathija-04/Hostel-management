# Quick setup

The full guide is in [README.md](README.md#quick-start). Short version:

```bash
npm run install:all
cp backend/.env.example backend/.env      # set DATABASE_URL (Postgres) and JWT_SECRET
cp frontend/.env.example frontend/.env
npm run setup:db                          # schema + migrations + demo data
npm run dev                               # API → http://localhost:5124
npm run dev:frontend                      # UI  → http://localhost:5212
```

Demo logins: student `STU2024001` / `student123`, warden `superadmin` / `admin123`.

Need a local Postgres? Run one in Docker:

```bash
docker run -d --name hostel-pg -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=portfolio postgres:16-alpine
```

Troubleshooting:
- `backend/.env not found`: copy `backend/.env.example` first.
- CORS errors in the browser: add the UI's origin to `FRONTEND_URL` in `backend/.env` (comma-separated).
- `GET /health` returns 503: the API can't reach Postgres. Check `DATABASE_URL`.
- Re-run the seed from scratch: drop only this app's schema (`DROP SCHEMA hostel_management CASCADE;`), then `npm run setup:db`.
