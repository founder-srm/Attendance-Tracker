"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Define the custom user profile based on the backend schema
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Stable client reference — createBrowserClient is a singleton internally,
  // but calling it on every render is wasteful. Use useState initializer.
  const [supabase] = useState(() => createClient());

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Fetch (or auto-create) the public.users profile for an authenticated user.
  const fetchOrCreateProfile = async (authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
  }): Promise<UserProfile | null> => {
    const { data: existingProfile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (!error && existingProfile) {
      return existingProfile as UserProfile;
    }

    // BUG-5 FIX: No DB trigger creates the public.users row on signup.
    // Auto-create it here using auth metadata as the fallback source of truth.
    // The RLS INSERT policy allows this because auth.uid() === authUser.id.
    console.warn(
      "No profile found for user — auto-creating from auth metadata. " +
        "Ask the backend team to add a Supabase trigger for production."
    );

    const fallbackName =
      authUser.user_metadata?.full_name ??
      authUser.email?.split("@")[0] ??
      "Member";

    const { data: newProfile, error: createError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        email: authUser.email ?? "",
        full_name: fallbackName,
        role: "member", // Default role for all self-signed-up users
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to auto-create profile:", createError.message);
      return null;
    }

    return newProfile as UserProfile;
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!mounted) return;
        setSession(currentSession);

        if (currentSession?.user) {
          const userProfile = await fetchOrCreateProfile(currentSession.user);
          if (mounted) setProfile(userProfile);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) setLoading(false); // CRITICAL: always dismiss loading screen
      }
    };

    initializeAuth();

    // Listen for login / logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (!newSession) {
        // User logged out
        setProfile(null);
        setLoading(false);
        return;
      }

      // User logged in or token refreshed — sync the profile
      setLoading(true);
      try {
        const userProfile = await fetchOrCreateProfile(newSession.user);
        if (mounted) setProfile(userProfile);
      } catch (err) {
        console.error("Profile sync error on auth change:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Strict Role-Based Routing
  useEffect(() => {
    if (loading) return;

    const isAuthPage =
      pathname === "/login" || pathname === "/signup" || pathname === "/";
    const isDashboard = pathname?.startsWith("/dashboard");
    const isAdminRoute = pathname?.startsWith("/admin");

    if (!session) {
      // Unauthenticated — middleware handles the heavy lifting, but client-side
      // guard catches any edge cases.
      if (isDashboard || isAdminRoute) {
        router.push("/login");
      }
    } else if (profile) {
      if (profile.role === "admin") {
        if (isAuthPage || isDashboard) router.push("/admin");
      } else if (profile.role === "member") {
        if (isAuthPage || isAdminRoute) router.push("/dashboard");
      }
    }
  }, [session, profile, loading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        isMember: profile?.role === "member",
      }}
    >
      {!loading ? (
        children
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="animate-pulse font-medium text-zinc-500">
            Loading Founders&apos; Club...
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
