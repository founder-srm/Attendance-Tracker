export async function markAttendance(
  meetingId: string,
  userId: string,
): Promise<{ id: string; meeting_id: string; user_id: string } | null> {
  return {
    id: "placeholder-attendance-id",
    meeting_id: meetingId,
    user_id: userId,
  };
}
