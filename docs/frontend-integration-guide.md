# Frontend Integration Guide

This guide is designed for the Frontend Team to quickly integrate with the backend services. All services run on the server-side (Server Components, Route Handlers, or Server Actions).

---

## 1. Authentication Consumption

Authentication operations should be performed on the client-side using the browser Supabase client or server-side via Server Actions.

### Client-Side Sign Up Example
```typescript
import { createClient } from "@/lib/supabase/client";

async function signUpUser(email: string, password: string, fullName: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error("Sign up failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
```

### Client-Side Login Example
```typescript
import { createClient } from "@/lib/supabase/client";

async function loginUser(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
```

---

## 2. Service Function Reference

All service functions are exported from `@/services/` and are fully typed.

---

### Users Service (`@/services/users`)

#### `getCurrentUser()`
* **Inputs**: None.
* **Outputs**: `Promise<User | null>`
* **Error Response**: Returns `null` on failure or if not logged in.
* **Usage**:
  ```typescript
  import { getCurrentUser } from "@/services/users";
  const user = await getCurrentUser();
  ```

#### `getUserById(id)`
* **Inputs**: `id` (`string`).
* **Outputs**: `Promise<User | null>`
* **Error Response**: Returns `null` on failure.

#### `getAllUsers()`
* **Inputs**: None.
* **Outputs**: `Promise<User[]>`
* **Error Response**: Returns empty array `[]`. Enforces RLS (members see only themselves).

#### `updateUserRole(id, role)`
* **Inputs**: `id` (`string`), `role` (`UserRole`).
* **Outputs**: `Promise<User | null>`
* **Error Response**: Returns `null` or throws `Error` if unauthorized. Only callable by admins.

---

### Meetings Service (`@/services/meetings`)

#### `createMeeting(meeting)`
* **Inputs**: `meeting` (`MeetingInsert`).
* **Outputs**: `Promise<Meeting | null>`
* **Error Response**: Returns `null` if the user is not authorized or if required parameters are missing.
* **Usage**:
  ```typescript
  import { createMeeting } from "@/services/meetings";

  const newMeeting = await createMeeting({
    title: "Weekly Club Sync",
    type: "Club",
    time_limit_minutes: 45,
    agenda: "Updates on backend foundation.",
    created_by: "user-uuid",
  });
  ```

#### `getMeeting(id)`
* **Inputs**: `id` (`string`).
* **Outputs**: `Promise<Meeting | null>`
* **Error Response**: Returns `null` if not found.

#### `getMeetings()`
* **Inputs**: None.
* **Outputs**: `Promise<Meeting[]>`
* **Error Response**: Returns empty array `[]`.
* **Usage**:
  ```typescript
  import { getMeetings } from "@/services/meetings";
  const meetings = await getMeetings();
  ```

#### `updateMeeting(id, updates)`
* **Inputs**: `id` (`string`), `updates` (`MeetingUpdate`).
* **Outputs**: `Promise<Meeting | null>`
* **Error Response**: Returns `null` on failure.

#### `deleteMeeting(id)`
* **Inputs**: `id` (`string`).
* **Outputs**: `Promise<boolean>`
* **Error Response**: Returns `false`.

---

### Attendance Service (`@/services/attendance`)

#### `markAttendance(meetingId, userId)`
* **Inputs**: `meetingId` (`string`), `userId` (`string`).
* **Outputs**: `Promise<Attendance | null>`
* **Error Response**: Returns `null`. Gracefully returns the existing record if already scanned.
* **Usage**:
  ```typescript
  import { markAttendance } from "@/services/attendance";
  const record = await markAttendance("meeting-uuid", "user-uuid");
  ```

#### `getAttendanceByUser(userId)`
* **Inputs**: `userId` (`string`).
* **Outputs**: `Promise<(Attendance & { meeting: Meeting | null })[]>`
* **Error Response**: Returns empty array `[]`.

#### `getAttendanceByMeeting(meetingId)`
* **Inputs**: `meetingId` (`string`).
* **Outputs**: `Promise<(Attendance & { user: User | null })[]>`
* **Error Response**: Returns empty array `[]`.

#### `hasUserScanned(meetingId, userId)`
* **Inputs**: `meetingId` (`string`), `userId` (`string`).
* **Outputs**: `Promise<boolean>`
* **Error Response**: Returns `false`.

---

### Events Service (`@/services/events`)

#### `createEvent(event)`
* **Inputs**: `event` (`EventInsert`).
* **Outputs**: `Promise<Event | null>`
* **Error Response**: Returns `null`.
* **Usage**:
  ```typescript
  import { createEvent } from "@/services/events";

  const newEvent = await createEvent({
    event_name: "Community Outreach",
    event_date: "2026-07-20",
    description: "Teaching basic web coding to local schools.",
  });
  ```

#### `getEvents()`
* **Inputs**: None.
* **Outputs**: `Promise<Event[]>`
* **Error Response**: Returns empty array `[]`.

#### `registerVolunteer(eventId, userId)`
* **Inputs**: `eventId` (`string`), `userId` (`string`).
* **Outputs**: `Promise<EventVolunteer | null>`
* **Error Response**: Returns `null` if registration fails.
* **Usage**:
  ```typescript
  import { registerVolunteer } from "@/services/events";
  const reg = await registerVolunteer("event-uuid", "user-uuid");
  ```

#### `getVolunteers(eventId)`
* **Inputs**: `eventId` (`string`).
* **Outputs**: `Promise<(EventVolunteer & { user: User | null })[]>`
* **Error Response**: Returns empty array `[]`.

---

### Analytics Service (`@/services/analytics`)

#### `getMemberAttendanceStats(userId)`
* **Inputs**: `userId` (`string`, optional).
* **Outputs**: `Promise<MemberAttendanceStats | MemberAttendanceStats[] | null>`
* **Error Response**: Returns `null` or `[]`.
* **Usage**:
  ```typescript
  import { getMemberAttendanceStats } from "@/services/analytics";

  // Fetch all stats (Admins only)
  const allStats = await getMemberAttendanceStats();

  // Fetch stats for a specific user
  const myStats = await getMemberAttendanceStats("user-uuid");
  ```

#### `getOverallAttendanceStats()`
* **Inputs**: None.
* **Outputs**: `Promise<OverallStats>`
* **Error Response**: Returns a zero-initialized stats structure.
* **Usage**:
  ```typescript
  import { getOverallAttendanceStats } from "@/services/analytics";
  const overall = await getOverallAttendanceStats();
  console.log(`Club Average: ${overall.averageAttendancePercentage}%`);
  ```
