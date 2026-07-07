-- ============================================================================
-- Migration: 001_add_attendance_status_source.sql
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================
-- CONTEXT
-- The original attendance table uses row-existence to indicate presence
-- (row = present, no row = absent). This migration extends the table to:
--   1. Add a `status` column (present | absent | excused) so admins can
--      explicitly record excused absences without deleting the row.
--   2. Add a `source` column (qr | manual) to distinguish QR-scanned
--      attendance from manually-marked records.
--   3. Add a `marked_by` column to record which admin performed a manual mark.
-- It also adds the CRITICAL user-profile-creation trigger that auto-inserts
-- into public.users when a new Supabase Auth user is created.
-- ============================================================================


-- ── PART 1: Extend the attendance table ──────────────────────────────────────

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS status  TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'excused')),

  ADD COLUMN IF NOT EXISTS source  TEXT NOT NULL DEFAULT 'qr'
    CHECK (source IN ('qr', 'manual')),

  ADD COLUMN IF NOT EXISTS marked_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

-- Existing rows were created via QR scan, so they're all 'present' from 'qr'.
-- The DEFAULT clauses above handle this automatically for existing rows.

COMMENT ON COLUMN public.attendance.status    IS 'Attendance status: present, absent, or excused';
COMMENT ON COLUMN public.attendance.source    IS 'How attendance was recorded: qr (scanner) or manual (admin)';
COMMENT ON COLUMN public.attendance.marked_by IS 'Admin user ID who performed a manual attendance mark';


-- ── PART 2: Update the member_attendance_stats view ──────────────────────────
-- With the status column, the view must only count 'present' rows,
-- not 'absent' or 'excused' rows, in the attended_meetings calculation.

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


-- ── PART 3: User profile auto-creation trigger ───────────────────────────────
-- CRITICAL: Without this trigger, signing up via Supabase Auth does NOT create
-- a row in public.users. This causes AuthProvider to show "Profile fetch failed"
-- and leaves the user stuck in a loading state.
--
-- The frontend has a JavaScript fallback (in AuthProvider.tsx) that creates the
-- profile on first login, but this DB trigger is the proper solution and should
-- be preferred in production.

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
  ON CONFLICT (id) DO NOTHING;  -- Idempotent: safe if JS fallback already created it

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the trigger first so this script is re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
