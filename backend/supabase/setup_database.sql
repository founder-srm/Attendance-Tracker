-- ============================================================================
-- Unified Database Setup Script for Attendance Tracker
-- Run this script inside the Supabase Dashboard → SQL Editor
-- This will initialize all custom types, base tables, views, and RLS policies.
-- ============================================================================

-- ── 1. CREATE CUSTOM ENUMS ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    CREATE TYPE public.meeting_type AS ENUM ('Club', 'Technical', 'Creatives', 'Outreach', 'Event', 'Other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_domain') THEN
    CREATE TYPE public.member_domain AS ENUM ('technical', 'creatives', 'operations', 'outreach', 'sponsorship');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_position') THEN
    CREATE TYPE public.member_position AS ENUM ('president', 'vice_president', 'hr', 'lead', 'associate_lead', 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
    CREATE TYPE public.meeting_status AS ENUM ('open', 'closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pre_notice_status') THEN
    CREATE TYPE public.pre_notice_status AS ENUM ('none', 'not_attending');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_source') THEN
    CREATE TYPE public.attendance_source AS ENUM ('manual', 'qr', 'auto');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'excused');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_shift_status') THEN
    CREATE TYPE public.event_shift_status AS ENUM ('invited', 'requested', 'confirmed', 'declined', 'present', 'absent');
  END IF;
END$$;


-- ── 2. CREATE BASE TABLES ───────────────────────────────────────────────────

-- Profile users table linked to Auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  domain public.member_domain,
  position_title public.member_position NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type public.meeting_type NOT NULL,
  time_limit_minutes INT NOT NULL DEFAULT 60,
  agenda TEXT,
  mom_url TEXT,
  qr_payload TEXT,
  status public.meeting_status NOT NULL DEFAULT 'open',
  date DATE,
  start_time TEXT, -- e.g. "05:00 PM"
  end_time TEXT, -- e.g. "07:00 PM"
  actual_start_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status public.attendance_status NOT NULL DEFAULT 'present',
  source public.attendance_source NOT NULL DEFAULT 'qr',
  marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  pre_meeting_notice_status public.pre_notice_status NOT NULL DEFAULT 'none',
  pre_meeting_notice_reason TEXT,
  CONSTRAINT unique_meeting_user UNIQUE (meeting_id, user_id)
);

-- Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT,
  start_date DATE,
  end_date DATE
);

-- Event Venues Table
CREATE TABLE IF NOT EXISTS public.event_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Event Shifts / Volunteers Table
CREATE TABLE IF NOT EXISTS public.event_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.event_venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.event_shift_status NOT NULL DEFAULT 'invited',
  decline_reason TEXT,
  CONSTRAINT unique_event_user_shift UNIQUE (event_id, user_id, shift_date, start_time)
);

-- Event Volunteers (Backward compatibility / legacy support if needed)
CREATE TABLE IF NOT EXISTS public.event_volunteers (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  marked_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  PRIMARY KEY (event_id, user_id)
);


-- ── 3. PROFILE AUTO-CREATION TRIGGER ────────────────────────────────────────
-- Automatically clones auth.users records into public.users profiles upon signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger first to ensure script is re-runnable safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- ── 4. ANALYTICAL VIEWS ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.member_attendance_stats AS
WITH meeting_count AS (
  SELECT COUNT(*)::INTEGER AS total FROM public.meetings
)
SELECT
  u.id                                           AS user_id,
  m.total                                        AS total_meetings,
  COUNT(a.id) FILTER (WHERE a.status = 'present')::INTEGER
                                                 AS attended_meetings,
  (m.total - COUNT(a.id) FILTER (WHERE a.status = 'present'))::INTEGER
                                                 AS missed_meetings,
  CASE
    WHEN m.total = 0 THEN 0.0
    ELSE ROUND(
      (COUNT(a.id) FILTER (WHERE a.status = 'present')::DECIMAL / m.total * 100),
      2
    )
  END                                            AS attendance_percentage
FROM
  public.users u
CROSS JOIN
  meeting_count m
LEFT JOIN
  public.attendance a ON u.id = a.user_id
GROUP BY
  u.id, m.total;


-- ── 5. STORAGE BUCKETS SETUP ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('mom-documents', 'mom-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;


-- ── 6. ENABLE ROW LEVEL SECURITY (RLS) ───────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;


-- ── 7. RLS HELPER FUNCTIONS ──────────────────────────────────────────────────
-- Checks if currently authenticated user is an admin profile
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Returns a user's role bypassing recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 8. DATABASE POLICIES ─────────────────────────────────────────────────────

-- Users Table Policies
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.users;
CREATE POLICY "Users can view own profile or admins can view all" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create their own profile or admins can create any" ON public.users;
CREATE POLICY "Users can create their own profile or admins can create any" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.users;
CREATE POLICY "Users can update their own profile or admins can update any" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (public.is_admin() OR (auth.uid() = id AND public.get_user_role(auth.uid()) = role));

DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
CREATE POLICY "Only admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Meetings Table Policies
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;
CREATE POLICY "Authenticated users can view meetings" ON public.meetings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can create meetings" ON public.meetings;
CREATE POLICY "Only admins can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update meetings" ON public.meetings;
CREATE POLICY "Only admins can update meetings" ON public.meetings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete meetings" ON public.meetings;
CREATE POLICY "Only admins can delete meetings" ON public.meetings
  FOR DELETE USING (public.is_admin());

-- Attendance Table Policies
DROP POLICY IF EXISTS "Users can view own attendance or admins can view all" ON public.attendance;
CREATE POLICY "Users can view own attendance or admins can view all" ON public.attendance
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can mark own attendance or admins can mark for anyone" ON public.attendance;
CREATE POLICY "Users can mark own attendance or admins can mark for anyone" ON public.attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can update attendance" ON public.attendance;
CREATE POLICY "Only admins can update attendance" ON public.attendance
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete attendance" ON public.attendance;
CREATE POLICY "Only admins can delete attendance" ON public.attendance
  FOR DELETE USING (public.is_admin());

-- Events Table Policies
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
CREATE POLICY "Authenticated users can view events" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can create events" ON public.events;
CREATE POLICY "Only admins can create events" ON public.events
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update events" ON public.events;
CREATE POLICY "Only admins can update events" ON public.events
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete events" ON public.events;
CREATE POLICY "Only admins can delete events" ON public.events
  FOR DELETE USING (public.is_admin());

-- Event Venues Table Policies
DROP POLICY IF EXISTS "Auth select venues" ON public.event_venues;
CREATE POLICY "Auth select venues" ON public.event_venues
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin CRUD venues" ON public.event_venues;
CREATE POLICY "Admin CRUD venues" ON public.event_venues
  FOR ALL USING (public.is_admin());

-- Event Shifts Table Policies
DROP POLICY IF EXISTS "Auth select shifts" ON public.event_shifts;
CREATE POLICY "Auth select shifts" ON public.event_shifts
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin CRUD shifts" ON public.event_shifts;
CREATE POLICY "Admin CRUD shifts" ON public.event_shifts
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Member self-manage shifts" ON public.event_shifts;
CREATE POLICY "Member self-manage shifts" ON public.event_shifts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Event Volunteers Table Policies (Legacy)
DROP POLICY IF EXISTS "Authenticated users can view event volunteers" ON public.event_volunteers;
CREATE POLICY "Authenticated users can view event volunteers" ON public.event_volunteers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can register themselves or admins can register anyone" ON public.event_volunteers;
CREATE POLICY "Users can register themselves or admins can register anyone" ON public.event_volunteers
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can update volunteer records" ON public.event_volunteers;
CREATE POLICY "Only admins can update volunteer records" ON public.event_volunteers
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can unregister themselves or admins can unregister anyone" ON public.event_volunteers;
CREATE POLICY "Users can unregister themselves or admins can unregister anyone" ON public.event_volunteers
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Storage Bucket Object Policies
DROP POLICY IF EXISTS "Public Read Access on mom-documents" ON storage.objects;
CREATE POLICY "Public Read Access on mom-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'mom-documents');

DROP POLICY IF EXISTS "Admin Write Access on mom-documents" ON storage.objects;
CREATE POLICY "Admin Write Access on mom-documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mom-documents');

DROP POLICY IF EXISTS "Public Read Access on avatars" ON storage.objects;
CREATE POLICY "Public Read Access on avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth Write Access on avatars" ON storage.objects;
CREATE POLICY "Auth Write Access on avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');
