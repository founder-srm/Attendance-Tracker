# _archive

This directory contains files that are no longer part of the live codebase.
They are preserved here for historical reference only.

**Do not import from, edit, or run anything in this directory.**

## Contents

### `reference-backend-setup-clone/`
A snapshot of the `Attendance-Tracker-feature-backend-setup` branch taken during the
initial backend wiring phase. The canonical SQL migrations now live in `../backend/supabase/migrations/`.

### Dead source files (from `Attendance-Tracker-frontend-main/src/`)
These files were superseded by Supabase-backed implementations and removed from the live tree:

| File | Replaced by |
|---|---|
| `AttendanceManagement.tsx` | `components/admin/ManualAttendancePanel.tsx` |
| `LoginForm.tsx` | Supabase auth flow via `AuthProvider.tsx` |
| `auth.ts` | `@/lib/supabase/client.ts` + `server.ts` |
| `exportExcel.ts` | Scheduled for future rebuild under `admin/export/` |
| `store.ts` | Supabase queries in `@/services/` |
| `supabase.ts` | Superseded by `@/lib/supabase/client.ts` and `server.ts` |
| `middleware.ts.backup` | `src/middleware.ts` (live) |
