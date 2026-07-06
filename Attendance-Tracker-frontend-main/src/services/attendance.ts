import { createClient } from "@/lib/supabase/server";

/**
 * Records attendance for a user in a meeting.
 * Uses UPSERT — safe to call multiple times; will not create duplicate rows.
 * The attendance table has a UNIQUE(meeting_id, user_id) constraint.
 *
 * Called from app/actions/attendance.ts (a Server Action).
 */
export async function markAttendance(
  meetingId: string,
  userId: string,
): Promise<{ id: string; meeting_id: string; user_id: string } | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        { meeting_id: meetingId, user_id: userId },
        { onConflict: "meeting_id,user_id" },
      )
      .select("id, meeting_id, user_id")
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in markAttendance:", error);
    return null;
  }
}
