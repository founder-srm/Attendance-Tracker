-- Create Custom Enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_shift_status') THEN
    CREATE TYPE public.event_shift_status AS ENUM ('invited', 'requested', 'confirmed', 'declined', 'present', 'absent');
  END IF;
END$$;

-- Alter existing events table if it exists, or create defensively
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT,
  event_date  DATE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- event_venues table
CREATE TABLE IF NOT EXISTS public.event_venues (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name     TEXT NOT NULL
);

-- event_shifts table
CREATE TABLE IF NOT EXISTS public.event_shifts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  venue_id       UUID REFERENCES public.event_venues(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_date     DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  status         public.event_shift_status NOT NULL DEFAULT 'invited',
  decline_reason TEXT,
  CONSTRAINT unique_event_user_shift UNIQUE (event_id, user_id, shift_date, start_time)
);

-- Enable RLS
ALTER TABLE public.event_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_shifts ENABLE ROW LEVEL SECURITY;

-- event_venues policies
DROP POLICY IF EXISTS "Auth select venues" ON public.event_venues;
DROP POLICY IF EXISTS "Admin CRUD venues" ON public.event_venues;

CREATE POLICY "Auth select venues" ON public.event_venues
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin CRUD venues" ON public.event_venues
  FOR ALL USING (public.is_admin());

-- event_shifts policies
DROP POLICY IF EXISTS "Auth select shifts" ON public.event_shifts;
DROP POLICY IF EXISTS "Admin CRUD shifts" ON public.event_shifts;
DROP POLICY IF EXISTS "Member self-manage shifts" ON public.event_shifts;

CREATE POLICY "Auth select shifts" ON public.event_shifts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin CRUD shifts" ON public.event_shifts
  FOR ALL USING (public.is_admin());

CREATE POLICY "Member self-manage shifts" ON public.event_shifts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
