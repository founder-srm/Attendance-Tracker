"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Define the custom user profile based on the backend schema
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "member";
  avatar_url?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  domain?: string | null;
  position_title?: string;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewingAsMember: boolean;
  setViewingAsMember: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isMember: false,
  isViewingAsMember: false,
  setViewingAsMember: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [supabase] = useState(() => createClient());

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isViewingAsMember, setViewingAsMemberState] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Load member view state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fc-member-view-mode");
      setViewingAsMemberState(stored === "true");
    }
  }, []);

  const setViewingAsMember = (val: boolean) => {
    setViewingAsMemberState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("fc-member-view-mode", val ? "true" : "false");
    }
  };

  // Fetch (or auto-create) the public.users profile for an authenticated user.
  const fetchOrCreateProfile = useCallback(async (authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
  }): Promise<UserProfile | null> => {

    try {
      const { data: existingProfile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!error && existingProfile) {
        return existingProfile as UserProfile;
      }
    } catch (e) {
      console.warn("Supabase fetch users failed, falling back to auto-creation:", e);
    }

    console.warn(
      "No profile found for user — auto-creating from auth metadata. " +
        "Ask the backend team to add a Supabase trigger for production.",
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
        role: "member", // Default role
      })
      .select()
      .single();

    if (createError) {
      console.error(
        "Failed to auto-create profile. Denying access (fail-closed):",
        createError.message,
      );
      return null;
    }

    return newProfile as UserProfile;
  }, [supabase]);

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
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (!newSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

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
  }, []);

  // Strict Role-Based Routing
  useEffect(() => {
    if (loading) return;

    const isAuthPage =
      pathname === "/login" || pathname === "/signup" || pathname === "/";
    const isDashboard = pathname?.startsWith("/dashboard");
    const isAdminRoute = pathname?.startsWith("/admin");

    if (!session) {
      if (isDashboard || isAdminRoute) {
        router.push("/login");
      }
    } else if (profile) {
      if (profile.role === "admin") {
        if (isViewingAsMember) {
          // If in member-view mode: allow access to /dashboard, block /admin
          if (isAuthPage || isAdminRoute) router.push("/dashboard");
        } else {
          // Normal admin mode: allow access to /admin, block /dashboard
          if (isAuthPage || isDashboard) router.push("/admin");
        }
      } else if (profile.role === "member") {
        if (isAuthPage || isAdminRoute) router.push("/dashboard");
      }
    }
  }, [session, profile, loading, pathname, router, isViewingAsMember]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        isMember: profile?.role === "member",
        isViewingAsMember,
        setViewingAsMember,
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
