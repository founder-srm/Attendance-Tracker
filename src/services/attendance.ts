import { createClient } from "@/lib/supabase/server";
import { type Attendance, type Meeting, type User } from "@/types/database";

/**
 * Marks a user's attendance for a specific meeting.
 * Since attendance is determined by row existence, this inserts a new row.
 */
export async function markAttendance(
  meetingId: string,
  userId: string,
): Promise<Attendance | null> {
  try {
    const supabase = await createClient();

    // Check if the record already exists to avoid unique constraint violations
    const alreadyScanned = await hasUserScanned(meetingId, userId);
    if (alreadyScanned) {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .single();
      return data as Attendance;
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        meeting_id: meetingId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Attendance;
  } catch (error) {
    console.error(
      `Error in markAttendance for meeting ${meetingId}, user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * Fetches all attendance records for a user, joining meeting details.
 */
export async function getAttendanceByUser(
  userId: string,
): Promise<(Attendance & { meeting: Meeting | null })[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance")
      .select("*, meeting:meetings(*)")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      meeting_id: row.meeting_id,
      user_id: row.user_id,
      scanned_at: row.scanned_at,
      meeting: Array.isArray(row.meeting) ? row.meeting[0] : row.meeting,
    })) as (Attendance & { meeting: Meeting | null })[];
  } catch (error) {
    console.error(`Error in getAttendanceByUser for user ${userId}:`, error);
    return [];
  }
}

/**
 * Fetches all attendance records for a meeting, joining user details.
 */
export async function getAttendanceByMeeting(
  meetingId: string,
): Promise<(Attendance & { user: User | null })[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance")
      .select("*, user:users(*)")
      .eq("meeting_id", meetingId);

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      meeting_id: row.meeting_id,
      user_id: row.user_id,
      scanned_at: row.scanned_at,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
    })) as (Attendance & { user: User | null })[];
  } catch (error) {
    console.error(
      `Error in getAttendanceByMeeting for meeting ${meetingId}:`,
      error,
    );
    return [];
  }
}

/**
 * Verifies if a user has scanned and marked attendance for a meeting.
 * Present = row exists, Absent = row does not exist.
 */
export async function hasUserScanned(
  meetingId: string,
  userId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error(
      `Error checking hasUserScanned for meeting ${meetingId}, user ${userId}:`,
      error,
    );
    return false;
  }
}
