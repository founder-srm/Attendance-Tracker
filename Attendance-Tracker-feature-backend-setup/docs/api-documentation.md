# API Documentation - Backend Services

This document details the backend service layer functions located in the `src/services/` directory. These service functions are designed to run on the server (Server Components, Route Handlers, or Server Actions).

---

## Users Service (`src/services/users.ts`)

### `getCurrentUser()`
* **Purpose**: Retrieves the currently logged-in user profile from the database based on the active Supabase session.
* **Parameters**: None.
* **Return Type**: `Promise<User | null>`
* **Example Usage**:
  ```typescript
  import { getCurrentUser } from "@/services/users";

  const profile = await getCurrentUser();
  if (profile) {
    console.log(`Welcome back, ${profile.full_name}! (Role: ${profile.role})`);
  } else {
    console.log("Not logged in");
  }
  ```
* **Error Cases**: Returns `null` if the user has no active session, if the profile does not exist in the database, or if the database request fails.

### `getUserById(id)`
* **Purpose**: Retrieves a user's profile information by their unique profile UUID.
* **Parameters**:
  * `id` (`string`): The UUID of the user.
* **Return Type**: `Promise<User | null>`
* **Example Usage**:
  ```typescript
  const user = await getUserById("a3b2c1d0-1234-5678-90ab-cdef12345678");
  ```
* **Error Cases**: Returns `null` if the user ID is invalid, doesn't exist, or if current RLS policies restrict the calling user from reading it.

### `getAllUsers()`
* **Purpose**: Lists all user profiles in the database.
* **Parameters**: None.
* **Return Type**: `Promise<User[]>`
* **Example Usage**:
  ```typescript
  const users = await getAllUsers();
  ```
* **Error Cases**: Returns an empty array `[]` if the database query fails. (Note: RLS policies will filter the list so that members only see their own profile, whereas admins see all users).

### `updateUserRole(id, role)`
* **Purpose**: Updates the role (`admin` or `member`) for a specific user.
* **Parameters**:
  * `id` (`string`): The UUID of the user.
  * `role` (`UserRole`): The new role.
* **Return Type**: `Promise<User | null>`
* **Example Usage**:
  ```typescript
  const updatedUser = await updateUserRole("user-uuid", "admin");
  ```
* **Error Cases**: Returns `null` if the user doesn't exist or if database constraints are violated. (Note: Uses the Supabase Service Role client to bypass RLS since modifying user roles is a restricted system operation).

---

## Meetings Service (`src/services/meetings.ts`)

### `createMeeting(meeting)`
* **Purpose**: Creates a new meeting.
* **Parameters**:
  * `meeting` (`MeetingInsert`): Structural record matching meeting data.
* **Return Type**: `Promise<Meeting | null>`
* **Example Usage**:
  ```typescript
  const newMeeting = await createMeeting({
    title: "V1 Launch Planning",
    type: "Technical",
    time_limit_minutes: 30,
    agenda: "Define milestone tasks and assign roles.",
    created_by: "creator-user-uuid"
  });
  ```
* **Error Cases**: Returns `null` if the caller is not an admin (enforced by RLS) or if a required field is missing.

### `getMeeting(id)`
* **Purpose**: Retrieves a single meeting by its ID.
* **Parameters**:
  * `id` (`string`): The meeting UUID.
* **Return Type**: `Promise<Meeting | null>`
* **Example Usage**:
  ```typescript
  const meeting = await getMeeting("meeting-uuid");
  ```
* **Error Cases**: Returns `null` if the meeting does not exist.

### `getMeetings()`
* **Purpose**: Lists all meetings, sorted by creation date descending.
* **Parameters**: None.
* **Return Type**: `Promise<Meeting[]>`
* **Example Usage**:
  ```typescript
  const meetings = await getMeetings();
  ```

### `updateMeeting(id, updates)`
* **Purpose**: Updates an existing meeting's fields (e.g., title, agenda, minutes of meeting notes).
* **Parameters**:
  * `id` (`string`): Meeting UUID.
  * `updates` (`MeetingUpdate`): Partial fields to update.
* **Return Type**: `Promise<Meeting | null>`
* **Example Usage**:
  ```typescript
  const updated = await updateMeeting("meeting-uuid", {
    mom: "Assigned tasks: Viva to create backend, User to review."
  });
  ```
* **Error Cases**: Returns `null` if the caller is not an admin, the meeting doesn't exist, or parameters are invalid.

### `deleteMeeting(id)`
* **Purpose**: Deletes a meeting from the system.
* **Parameters**:
  * `id` (`string`): Meeting UUID.
* **Return Type**: `Promise<boolean>`
* **Example Usage**:
  ```typescript
  const success = await deleteMeeting("meeting-uuid");
  ```
* **Error Cases**: Returns `false` if the deletion fails or if the caller lacks admin permissions.

---

## Attendance Service (`src/services/attendance.ts`)

### `markAttendance(meetingId, userId)`
* **Purpose**: Marks a user as present for a meeting (inserts an attendance log).
* **Parameters**:
  * `meetingId` (`string`): Meeting UUID.
  * `userId` (`string`): User UUID.
* **Return Type**: `Promise<Attendance | null>`
* **Example Usage**:
  ```typescript
  const attendanceRecord = await markAttendance("meeting-uuid", "user-uuid");
  ```
* **Error Cases**: Returns `null` if the meeting or user does not exist. Gracefully returns the existing record if the user was already marked present (preventing duplicate errors).

### `getAttendanceByUser(userId)`
* **Purpose**: Retrieves all meetings attended by a specific user, with nested meeting details.
* **Parameters**:
  * `userId` (`string`): User UUID.
* **Return Type**: `Promise<(Attendance & { meeting: Meeting | null })[]>`
* **Example Usage**:
  ```typescript
  const history = await getAttendanceByUser("user-uuid");
  history.forEach(record => {
    console.log(`Attended: ${record.meeting?.title} on ${record.scanned_at}`);
  });
  ```

### `getAttendanceByMeeting(meetingId)`
* **Purpose**: Retrieves all attendance logs for a specific meeting, with nested user profile details.
* **Parameters**:
  * `meetingId` (`string`): Meeting UUID.
* **Return Type**: `Promise<(Attendance & { user: User | null })[]>`
* **Example Usage**:
  ```typescript
  const attendees = await getAttendanceByMeeting("meeting-uuid");
  console.log(`Total attendees: ${attendees.length}`);
  ```

### `hasUserScanned(meetingId, userId)`
* **Purpose**: Verifies whether a user is marked present for a meeting.
* **Parameters**:
  * `meetingId` (`string`): Meeting UUID.
  * `userId` (`string`): User UUID.
* **Return Type**: `Promise<boolean>`
* **Example Usage**:
  ```typescript
  const isPresent = await hasUserScanned("meeting-uuid", "user-uuid");
  if (isPresent) {
    console.log("User is marked present.");
  } else {
    console.log("User is absent.");
  }
  ```

---

## Events & Volunteers Service (`src/services/events.ts`)

### `createEvent(event)`
* **Purpose**: Creates a new event record.
* **Parameters**:
  * `event` (`EventInsert`): Object representing the event fields.
* **Return Type**: `Promise<Event | null>`
* **Example Usage**:
  ```typescript
  const newEvent = await createEvent({
    event_name: "Annual Club Hackathon",
    event_date: "2026-10-15",
    description: "24-hour programming competition for college students."
  });
  ```

### `getEvents()`
* **Purpose**: Retrieves all events, sorted by date descending.
* **Parameters**: None.
* **Return Type**: `Promise<Event[]>`

### `registerVolunteer(eventId, userId)`
* **Purpose**: Registers a member as an event volunteer.
* **Parameters**:
  * `eventId` (`string`): Event UUID.
  * `userId` (`string`): User UUID.
* **Return Type**: `Promise<EventVolunteer | null>`
* **Example Usage**:
  ```typescript
  const registration = await registerVolunteer("event-uuid", "user-uuid");
  ```
* **Error Cases**: Returns `null` if the user is already registered for this event or if the IDs are invalid.

### `getVolunteers(eventId)`
* **Purpose**: Retrieves all volunteers signed up for a specific event, including user details.
* **Parameters**:
  * `eventId` (`string`): Event UUID.
* **Return Type**: `Promise<(EventVolunteer & { user: User | null })[]>`
* **Example Usage**:
  ```typescript
  const volunteers = await getVolunteers("event-uuid");
  ```

---

## Analytics Service (`src/services/analytics.ts`)

### `getMemberAttendanceStats(userId)`
* **Purpose**: Retrieves individual or all attendance statistics from the `member_attendance_stats` view.
* **Parameters**:
  * `userId` (`string`, optional): User UUID.
* **Return Type**: `Promise<MemberAttendanceStats | MemberAttendanceStats[] | null>`
* **Example Usage**:
  ```typescript
  // Get stats for a single user
  const userStats = await getMemberAttendanceStats("user-uuid");
  if (userStats && !Array.isArray(userStats)) {
    console.log(`Percentage: ${userStats.attendance_percentage}%`);
  }

  // Get stats for all users (Admin view)
  const allStats = await getMemberAttendanceStats();
  ```

### `getOverallAttendanceStats()`
* **Purpose**: Calculates club-wide aggregate statistics, including totals and averages.
* **Parameters**: None.
* **Return Type**: `Promise<OverallStats>`
* **Returned Fields**:
  * `totalUsers` (`number`): Number of club members.
  * `totalMeetings` (`number`): Number of meetings conducted.
  * `averageAttendancePercentage` (`number`): Average attendance score.
  * `highestAttendancePercentage` (`number`): Best attendance score.
  * `lowestAttendancePercentage` (`number`): Lowest attendance score.
* **Example Usage**:
  ```typescript
  const clubStats = await getOverallAttendanceStats();
  console.log(`Club Average Attendance: ${clubStats.averageAttendancePercentage}%`);
  ```
