# Founders' Club — Attendance & Event Management System

A clean, digital, and self-managing attendance and volunteer tracking system built for **Founders' Club**.

Instead of manual paper sheets and verbal counts, this platform allows admins to generate secure, rotating, time-bound QR codes for regular meetings, track multi-day volunteer events with an interactive interface, and give members full transparency over their attendance stats.

---

## What This System Solves
* **Automated Attendance:** Members scan dynamic, rotating QR codes to check in; expired windows automatically mark remaining expected members as absent when a meeting is closed.
* **Unified Tracking:** Categorizes regular Club Meets, Domain Meets (*Technical, Creatives, Operations, Outreach, Sponsorship*), and special Events separately.
* **Excel-Like Event Management:** Handles multi-day, multi-venue volunteer events with shift requests, manual approval workflows, and day-wise attendance grids.
* **Transparent Member Portal:** Every student gets a live dashboard showing their attendance percentage, historical MOMs (Minutes of Meeting), and an advance "Absence & Excuse" notice form.
* **Hardened Security:** Uses server-side HMAC-SHA-256 token signing (via `QR_SECRET`) to prevent client-side QR forgery, backed by fail-closed database profile handlers and Row Level Security (RLS) policies.

---

## Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 / Next.js 16 (App Router) | Responsive UI for member portals and admin dashboards. |
| **Styling** | Tailwind CSS v4 | Clean, modern, utility-first styling with custom laser scan keyframe animations. |
| **Linter / Formatter** | Biome | Quick and reliable lint checks. |
| **Backend & DB** | Supabase (PostgreSQL) | Serverless backend handling Auth, PostgreSQL database, and Realtime sync. |
| **Storage** | Supabase Storage | Cloud buckets for member profile avatars and uploaded meeting MOM documents (`mom-documents`). |
| **Hosting** | Vercel | Production edge deployment. |

---

## Clean Feature-Based Architecture
The repository is structured to separate frontend source code and backend SQL definitions:

```text
Attendance-Tracker/
├── Attendance-Tracker-frontend-main/     # Next.js Application
│   ├── src/
│   │   ├── app/                          # Routing & Layouts (/admin, /dashboard, /login, /signup)
│   │   ├── components/                   # UI components
│   │   │   ├── AuthProvider.tsx          # React Context Provider managing session & profile state
│   │   │   ├── admin/                    # Admin-only panels (MeetingManagement, MemberManagement, QRDisplay)
│   │   │   ├── shared/                   # Shared components (QRScanner camera view, RoleBadge)
│   │   │   └── ui/                       # Reusable UI primitives
│   │   ├── lib/                          # Shared utilities (Supabase client instance, domainColors)
│   │   ├── services/                     # API adapters connecting to Supabase (meetings, attendance, users)
│   │   ├── styles/                       # CSS files (globals.css containing Tailwind directives & keyframes)
│   │   └── types/                        # Shared TypeScript declarations
│   └── .env.local                        # Local environment credentials (ignored by git)
│
└── backend/                              # Central Database Repository
    └── supabase/
        ├── migrations/                   # Sequential SQL schema modifications
        ├── policies/                     # Row Level Security (RLS) SQL policy rules
        ├── views/                        # Analytical SQL views (e.g. member_attendance_stats)
        └── setup_database.sql            # Combined database initialization script
```

---

## Getting Started (Local Development)

### 1. Prerequisites
* Node.js (v18 or higher recommended)
* Git
* A Supabase project instance

### 2. Clone & Install
```bash
git clone https://github.com/founder-srm/Attendance-Tracker.git
cd Attendance-Tracker-frontend-main
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root of `Attendance-Tracker-frontend-main/`:

```env
# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Security Key for QR Token HMAC Signing (Server-Only!)
QR_SECRET=your_super_secret_random_string_here
```

> [!WARNING]
> Never prefix `QR_SECRET` with `NEXT_PUBLIC_`, as this would leak your signing key into the browser bundle and compromise QR validity.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Core Database Schema
The database uses a relational PostgreSQL schema:
* **`users`**: Stores profile information, domain assignments (`technical`, `creatives`, `operations`, `outreach`, `sponsorship`), avatars, phone numbers, and organizational positions (`president`, `vice_president`, `hr`, `lead`, `associate_lead`, `member`).
* **`meetings`**: Logs scheduled meetings, domain restrictions, MOM storage URLs, agendas, active/closed statuses, and actual start times.
* **`attendance`**: Maps users to meetings with statuses (`present`, `absent`, `excused`), tracking scan timestamps, check-in source (`manual`, `qr`, `auto`), and advance absence reasons.
* **`events`**, **`event_venues`**, **`event_shifts`**: Support multi-day events, venue-specific volunteering rosters, and shift request approvals.

---

## Git Workflow & Branching Strategy
We use a feature-branch workflow to prevent merge conflicts and protect the production branch:

```text
main <--- develop1 <--- feature/your-feature-name
```

* **Branch Naming Conventions:**
  * `feature/...` — For building new modules or UI components (e.g., `feature/qr-scanner`).
  * `fix/...` — For fixing code glitches or security patches (e.g., `fix/auth-fail-closed`).
  * `docs/...` — For documentation updates (e.g., `docs/schema-update`).

* **Pull Request (PR) Rules:**
  1. Never commit directly to `main` or `develop1`. Always push to a branch and open a PR.
  2. Every PR must contain a clear description of what changed and why.
  3. No self-merging. Another team member must review and approve the code.
  4. Ensure `npm run build` and linter checks pass with zero errors before requesting review.

---

## Security & Fail-Closed Model
* **Fail-Closed Auth:** If a profile query fails or drops due to a network glitch, the system defaults to minimum permissions (`member` fallback or access denied), never promoting users to admin.
* **Server-Validated QR:** Scanned tokens are passed directly to Next.js Server Actions where they are validated using HMAC-SHA-256 matching. The client browser has no access to the secret key, preventing QR spoofing.
* **Time-Bound Verification:** QR codes expire dynamically based on rotation intervals and overall meeting limits.
