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
  const supabase = createClient();

  //  TEMPORARY MOCK DATA FOR UI TESTING
  // const [session, setSession] = useState<any>({ user: { id: 'mock-123' } });

  // const [profile, setProfile] = useState<any>({
  //   id: 'mock-123',
  //   full_name: 'Test Profile',
  //   email: 'test@founders.com',
  //   // role: 'member' // <-- CHANGE THIS TO 'admin' TO TEST THE ADMIN PORTAL!
  //   role: 'admin'
  // });

  // const [loading, setLoading] = useState(false); // Important: Keep this false!

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Helper to fetch the custom user profile from the database
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    return data as UserProfile;
  };

  // useEffect(() => {
  //   let mounted = true;

  //   const initializeAuth = async () => {
  //     const { data: { session } } = await supabase.auth.getSession();

  //     if (session) {
  //       const userProfile = await fetchProfile(session.user.id);
  //       if (mounted) {
  //         setSession(session);
  //         setProfile(userProfile);
  //         setLoading(false);
  //       }
  //     } else {
  //       if (mounted) {
  //         setSession(null);
  //         setProfile(null);
  //         setLoading(false);
  //       }
  //     }
  //   };

  //   initializeAuth();

  //   // Listen for auth state changes (Login/Logout)
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
  //     if (newSession) {
  //       const userProfile = await fetchProfile(newSession.user.id);
  //       setSession(newSession);
  //       setProfile(userProfile);
  //     } else {
  //       setSession(null);
  //       setProfile(null);
  //     }
  //     setLoading(false);
  //   });

  //   return () => {
  //     mounted = false;
  //     subscription.unsubscribe();
  //   };
  // }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Get the active session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (mounted) setSession(session);

        // 2. Try to fetch the profile ONLY if we have a session
        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError) {
            // WARNING: This will trigger until the backend dev runs the SQL!
            console.warn(
              "Profile fetch failed (waiting for DB trigger):",
              profileError.message,
            );
          } else if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false); // <-- CRITICAL: This guarantees the loading screen dismisses
      }
    };

    initializeAuth();

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        // If they just logged out, clear the profile and finish loading
        if (!session) {
          setProfile(null);
          setLoading(false);
        } else {
          // If they logged in, re-run the initialization
          setLoading(true);
          initializeAuth();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Strict Role-Based Routing logic
  useEffect(() => {
    if (loading) return;

    const isAuthPage =
      pathname === "/login" || pathname === "/signup" || pathname === "/";
    const isDashboard = pathname?.startsWith("/dashboard");
    const isAdminRoute = pathname?.startsWith("/admin");

    if (!session) {
      // Unauthenticated users cannot access protected routes
      if (isDashboard || isAdminRoute) {
        router.push("/login");
      }
    } else if (profile) {
      // Authenticated routing based on Role
      if (profile.role === "admin") {
        if (isAuthPage || isDashboard) router.push("/admin"); // Admins belong in /admin
      } else if (profile.role === "member") {
        if (isAuthPage || isAdminRoute) router.push("/dashboard"); // Members belong in /dashboard
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
            Loading Founders' Club...
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
