-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. SELECT: Users can view their own attendance, Admins can view all attendance
CREATE POLICY "Users can view own attendance or admins can view all" 
ON public.attendance
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 2. INSERT: Users can mark their own attendance, Admins can mark attendance for anyone
CREATE POLICY "Users can mark own attendance or admins can mark for anyone" 
ON public.attendance
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 3. UPDATE: Only admins can update attendance records
CREATE POLICY "Only admins can update attendance" 
ON public.attendance
FOR UPDATE 
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. DELETE: Only admins can delete attendance records
CREATE POLICY "Only admins can delete attendance" 
ON public.attendance
FOR DELETE 
USING (
  public.is_admin()
);
