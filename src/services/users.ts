import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type User, type UserRole } from "@/types/database";
import { isAdmin } from "@/lib/permissions";

/**
 * Retrieves the currently logged-in user's authentication and database profile.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      // If profile is missing but authenticated, return a partial object or null
      return null;
    }

    return profile as User;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

/**
 * Retrieves a user's profile by their unique ID.
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return user as User;
  } catch (error) {
    console.error(`Error in getUserById for ${id}:`, error);
    return null;
  }
}

/**
 * Retrieves all user profiles.
 * Admins will see all users. Members will see only their own due to RLS policies.
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const supabase = await createClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      throw error;
    }

    return (users || []) as User[];
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return [];
  }
}

/**
 * Updates a user's role (admin or member).
 * Uses the admin client (service role) since role changes are highly restricted.
 */
export async function updateUserRole(
  id: string,
  role: UserRole,
): Promise<User | null> {
  try {
    // 1. Verify that the caller is an admin
    const currentUser = await getCurrentUser();
    if (!isAdmin(currentUser)) {
      throw new Error("Unauthorized: Only admins can update user roles.");
    }

    // 2. Perform the update using the admin client (which bypasses RLS)
    const supabase = await createAdminClient();
    const { data: user, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return user as User;
  } catch (error) {
    console.error(`Error in updateUserRole for user ${id} to ${role}:`, error);
    return null;
  }
}
