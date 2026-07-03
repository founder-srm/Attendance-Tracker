-- Enable Row Level Security
ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. SELECT: Any authenticated user can view event volunteers
CREATE POLICY "Authenticated users can view event volunteers" 
ON public.event_volunteers
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- 2. INSERT: Users can register themselves, Admins can register anyone
CREATE POLICY "Users can register themselves or admins can register anyone" 
ON public.event_volunteers
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 3. UPDATE: Only admins can update volunteer records
CREATE POLICY "Only admins can update volunteer records" 
ON public.event_volunteers
FOR UPDATE 
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. DELETE: Users can cancel their own registration, Admins can cancel any
CREATE POLICY "Users can unregister themselves or admins can unregister anyone" 
ON public.event_volunteers
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR public.is_admin()
);
