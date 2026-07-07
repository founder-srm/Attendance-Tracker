-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. SELECT: Any authenticated user can view events
CREATE POLICY "Authenticated users can view events" 
ON public.events
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- 2. INSERT: Only admins can create events
CREATE POLICY "Only admins can create events" 
ON public.events
FOR INSERT 
WITH CHECK (
  public.is_admin()
);

-- 3. UPDATE: Only admins can update events
CREATE POLICY "Only admins can update events" 
ON public.events
FOR UPDATE 
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. DELETE: Only admins can delete events
CREATE POLICY "Only admins can delete events" 
ON public.events
FOR DELETE 
USING (
  public.is_admin()
);
