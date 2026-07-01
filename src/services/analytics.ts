import { createClient } from "@/lib/supabase/server";
import { type MemberAttendanceStats } from "@/types/database";

export interface OverallStats {
  totalUsers: number;
  totalMeetings: number;
  averageAttendancePercentage: number;
  highestAttendancePercentage: number;
  lowestAttendancePercentage: number;
}

/**
 * Retrieves attendance statistics for a single member or all members.
 * If userId is provided, returns that user's record (or null if not found).
 * If no userId is provided, returns all records.
 */
export async function getMemberAttendanceStats(
  userId?: string,
): Promise<MemberAttendanceStats | MemberAttendanceStats[] | null> {
  try {
    const supabase = await createClient();

    if (userId) {
      const { data, error } = await supabase
        .from("member_attendance_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as MemberAttendanceStats | null;
    }

    const { data, error } = await supabase
      .from("member_attendance_stats")
      .select("*");

    if (error) {
      throw error;
    }

    return (data || []) as MemberAttendanceStats[];
  } catch (error) {
    console.error(
      `Error in getMemberAttendanceStats for user ${userId || "all"}:`,
      error,
    );
    return userId ? null : [];
  }
}

/**
 * Calculates club-wide aggregate attendance metrics.
 */
export async function getOverallAttendanceStats(): Promise<OverallStats> {
  try {
    const supabase = await createClient();

    // Fetch all attendance statistics to aggregate them on the server
    const { data: stats, error } = await supabase
      .from("member_attendance_stats")
      .select("*");

    if (error) {
      throw error;
    }

    const totalUsers = stats?.length || 0;
    const totalMeetings = stats?.[0]?.total_meetings || 0;

    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        totalMeetings,
        averageAttendancePercentage: 0,
        highestAttendancePercentage: 0,
        lowestAttendancePercentage: 0,
      };
    }

    const percentages = stats.map((s) => Number(s.attendance_percentage));
    const totalPercentageSum = percentages.reduce((sum, p) => sum + p, 0);

    const averageAttendancePercentage = Number(
      (totalPercentageSum / totalUsers).toFixed(2),
    );
    const highestAttendancePercentage = Math.max(...percentages);
    const lowestAttendancePercentage = Math.min(...percentages);

    return {
      totalUsers,
      totalMeetings,
      averageAttendancePercentage,
      highestAttendancePercentage,
      lowestAttendancePercentage,
    };
  } catch (error) {
    console.error("Error in getOverallAttendanceStats:", error);
    return {
      totalUsers: 0,
      totalMeetings: 0,
      averageAttendancePercentage: 0,
      highestAttendancePercentage: 0,
      lowestAttendancePercentage: 0,
    };
  }
}
