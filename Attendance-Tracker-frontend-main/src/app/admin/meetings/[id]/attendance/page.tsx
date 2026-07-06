import ManualAttendancePanel from "@/components/ManualAttendancePanel";

/**
 * Per-meeting attendance page.
 * Previously rendered AttendanceManagement (mock localStorage component).
 * Now renders ManualAttendancePanel — the real Supabase-backed attendance tool.
 * The [id] segment is not used here; attendance is selected inside the panel.
 */
export default function MeetingAttendancePage() {
  return <ManualAttendancePanel />;
}