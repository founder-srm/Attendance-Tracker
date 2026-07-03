"use server";

import { markAttendance as backendMarkAttendance } from "@/services/attendance";
import { getCurrentUser } from "@/services/users";

export async function submitAttendanceAction(meetingId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const attendanceRecord = await backendMarkAttendance(meetingId, user.id);

    if (!attendanceRecord) {
      return { success: false, error: "Failed to mark attendance or already marked." };
    }

    return { success: true, data: attendanceRecord };
  } catch (error) {
    console.error("Action Error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
