-- Create custom enums if they do not exist
DO $$
BEGIN
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
END$$;

-- 1. Extend public.users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS domain public.member_domain,
  ADD COLUMN IF NOT EXISTS position_title public.member_position NOT NULL DEFAULT 'member';

-- 2. Extend public.meetings table
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS status public.meeting_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS mom_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_payload TEXT,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS start_time TEXT, -- e.g. "5:00 PM"
  ADD COLUMN IF NOT EXISTS end_time TEXT, -- e.g. "7:00 PM"
  ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ;

-- 3. Extend public.attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS status public.attendance_status NOT NULL DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS source public.attendance_source NOT NULL DEFAULT 'qr',
  ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pre_meeting_notice_status public.pre_notice_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pre_meeting_notice_reason TEXT;

-- 4. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('mom-documents', 'mom-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for storage
CREATE POLICY "Public Read Access on mom-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'mom-documents');

CREATE POLICY "Admin Write Access on mom-documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mom-documents');

CREATE POLICY "Public Read Access on avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Auth Write Access on avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

