-- Enable Row Level Security
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. SELECT: Any authenticated user can view meetings
CREATE POLICY "Authenticated users can view meetings" 
ON public.meetings
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- 2. INSERT: Only admins can create meetings
CREATE POLICY "Only admins can create meetings" 
ON public.meetings
FOR INSERT 
WITH CHECK (
  public.is_admin()
);

-- 3. UPDATE: Only admins can update meetings
CREATE POLICY "Only admins can update meetings" 
ON public.meetings
FOR UPDATE 
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. DELETE: Only admins can delete meetings
CREATE POLICY "Only admins can delete meetings" 
ON public.meetings
FOR DELETE 
USING (
  public.is_admin()
);
