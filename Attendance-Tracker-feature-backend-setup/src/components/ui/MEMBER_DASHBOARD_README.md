# Member Dashboard 

React component for the **Founders Club Attendance Tracker** :
member dashboard UI, attendance stats, history table with filters, analytics charts, and profile page.

---

## File Location

```
Attendance-Tracker/
└── src/
    └── components/
        └── MemberDashboard.jsx   ← this file
```

---

## Route Setup (coordinate with Person 2)

This is a **Next.js App Router** project — no React Router needed. To wire up the dashboard, create:

```
Attendance-Tracker/
└── src/
    └── app/
        └── dashboard/
            └── page.tsx    ← create this new file
```

Paste this inside `page.tsx`:

```tsx
import MemberDashboard from "@/components/MemberDashboard";

export default function DashboardPage() {
  return <MemberDashboard />;
}
```

The dashboard will be live at `/dashboard`.

---

## Branch & Repo

| Field | Value |
|---|---|
| Branch | `feature/FeTrack` |
| Fork | `RichaSingh0123/Attendance-Tracker` |
| Upstream | `founder-srm/Attendance-Tracker` |

---

## Things to Change Before Pushing

### 1. User Data
Replace the `MOCK_USER` object at the top of `MemberDashboard.jsx` with a real Supabase fetch.

```js
// Current (mock) — lines 4–11
const MOCK_USER = {
  id: "user-001",           // ← replace with auth session user ID
  name: "Richa",            // ← replace with user's display name from DB
  email: "richa@foundersclub.org", // ← replace with user's email from auth
  role: "Member",           // ← replace with role from users table
  joinedAt: "2024-08-01",   // ← replace with created_at from users table
  avatar: null,             // ← replace with avatar_url if your DB stores one
};
```

**Supabase equivalent (ask Person 1 for exact table/column names):**
```js
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();
```

---

### 2. Attendance Records
Replace `MOCK_ATTENDANCE` with a real Supabase query.

```js
// Current (mock) — lines 13–26
const MOCK_ATTENDANCE = [
  { id: 1, meeting: "Weekly Sync #1", date: "2025-01-06", status: "present", duration: 60 },
  // ...
];
```

Each record needs these fields:

| Field | Type | Description |
|---|---|---|
| `id` | number/string | Unique record ID |
| `meeting` | string | Meeting name |
| `date` | string `YYYY-MM-DD` | Date of meeting |
| `status` | `"present"` or `"absent"` | Attendance status |
| `duration` | number | Duration in minutes |

**Supabase equivalent:**
```js
const { data: attendance } = await supabase
  .from('attendance')
  .select('id, status, meetings(name, date, duration)')
  .eq('user_id', user.id)
  .order('date', { ascending: false });
```

---

### 3. Bar Chart Months
The bar chart currently hardcodes Jan–Mar. Update the `months` array to match your actual data range.

```js
// Line ~128
const months = ["Jan", "Feb", "Mar"]; // ← update to your active months
```

---

### 4. Default Theme
The dashboard opens in dark mode by default. Change to `"light"` if preferred.

```js
const [theme, setTheme] = useState("dark"); // ← change to "light" if needed
```
