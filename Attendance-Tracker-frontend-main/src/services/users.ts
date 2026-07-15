import { createClient } from "@/lib/supabase/server";

/**
 * Returns the full public.users profile for the currently authenticated user.
 * Called from server actions — uses the server Supabase client (cookie-based session).
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  role: string;
  full_name: string;
} | null> {
  try {
    const supabase = await createClient();

    // getUser() is the correct server-side auth check (not getSession, which is client-side)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.warn(
        "Profile not found for authenticated user. Denying access (fail-closed).",
        profileError?.message,
      );
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}
