# Attendance Tracker — Workspace Root

This repository contains two top-level directories:

| Directory | Purpose |
|---|---|
| `Attendance-Tracker-frontend-main/` | **Primary working directory** — the Next.js 14 web app. All development happens here. |
| `backend/` | SQL migration files only. Apply these to your Supabase project via the Supabase dashboard or CLI. |
| `_archive/` | Reference clone and obsolete files preserved for history. **Do not edit or import from here.** |

## Getting Started

```bash
cd Attendance-Tracker-frontend-main
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Migrations

Run migration files in `backend/supabase/migrations/` in numeric order against your Supabase project.

## Branch Strategy

| Branch | Purpose |
|---|---|
| `develop1` | Integration branch — all features merge here first |
| `feature/NewChanges` | Current feature branch |
| `main` | Production-ready code |
