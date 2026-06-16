-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is an admin
-- Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to get a user's role without triggering RLS recursion
-- Uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies

-- 1. SELECT: Users can view their own profile, Admins can view all profiles
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.users
FOR SELECT 
USING (
  auth.uid() = id 
  OR public.is_admin()
);

-- 2. INSERT: Users can insert their own profile (e.g., during registration), Admins can insert any
CREATE POLICY "Users can create their own profile or admins can create any" 
ON public.users
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  OR public.is_admin()
);

-- 3. UPDATE: Users can update their own profile, Admins can update any
-- Enforces that non-admin users cannot change their own role during update
CREATE POLICY "Users can update their own profile or admins can update any" 
ON public.users
FOR UPDATE 
USING (
  auth.uid() = id 
  OR public.is_admin()
)
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = id 
    AND public.get_user_role(auth.uid()) = role
  )
);

-- 4. DELETE: Only admins can delete user profiles
CREATE POLICY "Only admins can delete users" 
ON public.users
FOR DELETE 
USING (
  public.is_admin()
);
