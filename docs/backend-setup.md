# Backend Setup Guide

This document describes how to configure, set up, and deploy the Supabase backend foundation for the Attendance Tracker application.

---

## 1. Environment Variables

Create a `.env.local` file (or update your project environment configuration) in the root of the project. Fill in the credentials from your Supabase Project Settings:

```env
# Public Supabase Client Configurations
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-Side Private Configurations (DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

* **`NEXT_PUBLIC_SUPABASE_URL`**: Found in Supabase Dashboard -> Project Settings -> API -> Project URL.
* **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Found in Supabase Dashboard -> Project Settings -> API -> `anon` `public` key.
* **`SUPABASE_SERVICE_ROLE_KEY`**: Found in Supabase Dashboard -> Project Settings -> API -> `service_role` `secret` key. Used by administrative backend services (e.g. `updateUserRole`).

---

## 2. Supabase Setup & Authentication

1. **Email Auth Configuration**:
   - Go to your Supabase Dashboard -> Authentication -> Providers -> Email.
   - Enable "Confirm Email" if you want validation, or disable it for local testing.
   - Ensure the redirect URL is set to your application hostname (e.g., `http://localhost:3000`).

2. **Trigger to Sync Auth Users to Profiles**:
   - To automatically create a profile in the `public.users` table when a user registers, execute the following SQL in your Supabase SQL Editor:
     ```sql
     -- Create a function to handle new registrations
     CREATE OR REPLACE FUNCTION public.handle_new_user()
     RETURNS TRIGGER AS $$
     BEGIN
       INSERT INTO public.users (id, full_name, email, role)
       VALUES (
         new.id,
         COALESCE(new.raw_user_metadata->>'full_name', 'New Member'),
         new.email,
         'member'::public.user_role
       );
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;

     -- Create the trigger
     CREATE OR REPLACE TRIGGER on_auth_user_created
       AFTER INSERT ON auth.users
       FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
     ```

---

## 3. Policy and View Deployment

Deploy database views and security rules directly inside the Supabase SQL editor:

1. **Enable policies**:
   - Copy the SQL content from `backend/supabase/policies/users.sql` and run it in the SQL editor. (This creates the critical `public.is_admin()` helper function).
   - Run the rest of the policy files:
     - `backend/supabase/policies/meetings.sql`
     - `backend/supabase/policies/attendance.sql`
     - `backend/supabase/policies/events.sql`
     - `backend/supabase/policies/event_volunteers.sql`

2. **Deploy analytical views**:
   - Copy the SQL content from `backend/supabase/views/member_attendance_stats.sql` and run it in the SQL editor.

---

## 4. Production Deployment

* **Security Role Key**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secret and NEVER leaked in browser bundles. (It is excluded because it is not prefixed with `NEXT_PUBLIC_`).
* **Environment Configuration**: Set the environment variables in your hosting provider (Vercel, Netlify, etc.) using their dashboards.
* **SSL & Session Cookie Security**: Next.js Server Actions automatically configure cookie settings. Supabase cookies are set as `HttpOnly`, `Secure` (in production), and `SameSite=Lax` for optimal security.
