"use client";

import { createClient } from "@/lib/supabase/client";

// ── Types matching the actual Supabase users table ─────────────────────────────

export type UserRole = "admin" | "member";

export type MemberDomain =
  | "technical"
  | "creatives"
  | "operations"
  | "outreach"
  | "sponsorship";

export type MemberPosition =
  | "president"
  | "vice_president"
  | "hr"
  | "lead"
  | "associate_lead"
  | "member";

export type AppUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null; // format YYYY-MM-DD
  domain: MemberDomain | null;
  position_title: MemberPosition;
  created_at: string;
};

// ── Client-side service functions (use Supabase browser client) ────────────────

export async function getUsers(): Promise<{
  data: AppUser[] | null;
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as AppUser[]) || [], error: null };
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<AppUser, "full_name" | "role" | "position_title" | "domain" | "phone" | "date_of_birth" | "avatar_url">>
): Promise<{ data: AppUser | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AppUser, error: null };
}

/**
 * Upload profile picture to avatars bucket and update users.avatar_url
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  
  // Save avatar_url to public.users profile
  const { error: dbError } = await supabase
    .from("users")
    .update({ avatar_url: data.publicUrl })
    .eq("id", userId);

  if (dbError) return { url: null, error: dbError.message };

  return { url: data.publicUrl, error: null };
}

/**
 * Set pre-meeting notice for a member
 */
export async function setPreMeetingNotice(
  meetingId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  try {
    // Check if the meeting is already closed
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("status")
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    const isClosed = meeting?.status === "closed";

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          meeting_id: meetingId,
          user_id: userId,
          status: isClosed ? "excused" : "absent", // Promote immediately if meeting is closed
          pre_meeting_notice_status: "not_attending",
          pre_meeting_notice_reason: reason
        },
        { onConflict: "meeting_id,user_id" }
      );

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
