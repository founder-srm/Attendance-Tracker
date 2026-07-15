"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { setPreMeetingNotice } from "@/services/members";
import { Button } from "@/components/ui/button";
import { getDomainColorClass } from "@/lib/domainColors";
import { FileText } from "lucide-react";

type AttendanceStats = {
  total_meetings: number;
  attended_meetings: number;
  missed_meetings: number;
  attendance_percentage: number;
};

type HistoryItem = {
  id: string;
  scanned_at: string;
  status: string;
  meetings: { title: string; type: string } | null;
};

type EligibleMeeting = {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string | null;
  attendance: {
    id: string;
    status: string;
    pre_meeting_notice_status: string;
    pre_meeting_notice_reason: string | null;
  }[];
};

type ClosedMeetingItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  agenda: string | null;
  mom_url: string | null;
};

export default function DashboardPage() {
  const { profile } = useAuth();

  // Stats and history state
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Absence/excuse states
  const [eligibleMeetings, setEligibleMeetings] = useState<EligibleMeeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [noticeReason, setNoticeReason] = useState("");
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Past meetings state
  const [closedMeetings, setClosedMeetings] = useState<ClosedMeetingItem[]>([]);

  const supabase = createClient();

  const loadDashboardData = async () => {
    if (!profile?.id) return;
    setDataLoading(true);
    setDataError(null);

    try {
      // 1. Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .from("member_attendance_stats")
        .select("total_meetings_held, meetings_attended, meetings_missed, attendance_percentage")
        .eq("user_id", profile.id)
        .single();

      if (statsError && statsError.code !== "PGRST116") {
        console.error("Stats fetch error:", statsError.message);
      } else if (statsData) {
        setStats({
          total_meetings: statsData.total_meetings_held,
          attended_meetings: statsData.meetings_attended,
          missed_meetings: statsData.meetings_missed,
          attendance_percentage: statsData.attendance_percentage,
        });
      }

      // 2. Fetch recent attendance history
      const { data: historyData, error: histError } = await supabase
        .from("attendance")
        .select("id, scanned_at, status, meetings(title, type)")
        .eq("user_id", profile.id)
        .order("scanned_at", { ascending: false })
        .limit(5);

      if (histError) {
        console.error("History fetch error:", histError.message);
      } else {
        setHistory((historyData as unknown as HistoryItem[]) || []);
      }

      // 3. Fetch eligible meetings for setting excuses
      // Condition A: Fetch all open meetings
      const { data: openMeetings, error: openErr } = await supabase
        .from("meetings")
        .select("id, title, type, status, date")
        .eq("status", "open");

      if (openErr) {
        console.error("Open meetings fetch error:", openErr.message);
      }

      // Condition B: Fetch closed meetings where user is marked absent
      const { data: absentAtt, error: absentErr } = await supabase
        .from("attendance")
        .select(`
          id,
          status,
          meetings (
            id,
            title,
            type,
            status,
            date
          )
        `)
        .eq("user_id", profile.id)
        .eq("status", "absent");

      if (absentErr) {
        console.error("Absent records fetch error:", absentErr.message);
      }

      const combined: EligibleMeeting[] = [];

      // Add all open meetings (no attendance record required)
      if (openMeetings) {
        openMeetings.forEach((m) => {
          combined.push({
            id: m.id,
            title: m.title,
            type: m.type,
            status: m.status,
            date: m.date,
            attendance: [],
          });
        });
      }

      // Add closed meetings where user is marked absent
      if (absentAtt) {
        absentAtt.forEach((a) => {
          const meeting = Array.isArray(a.meetings) ? a.meetings[0] : (a.meetings as any);
          if (meeting && meeting.status === "closed") {
            combined.push({
              id: meeting.id,
              title: meeting.title,
              type: meeting.type,
              status: meeting.status,
              date: meeting.date,
              attendance: [
                {
                  id: a.id,
                  status: a.status,
                  pre_meeting_notice_status: "",
                  pre_meeting_notice_reason: null,
                },
              ],
            });
          }
        });
      }

      setEligibleMeetings(combined);

      // 4. Fetch past closed meetings history (chronologically in descending order)
      const { data: closedData, error: closedErr } = await supabase
        .from("meetings")
        .select("id, title, type, status, date, start_time, end_time, agenda, mom_url")
        .eq("status", "closed")
        .order("date", { ascending: false });

      if (closedErr) {
        console.error("Closed meetings fetch error:", closedErr.message);
      } else {
        setClosedMeetings((closedData as ClosedMeetingItem[]) || []);
      }
    } catch (err) {
      setDataError("Could not load attendance data. Please refresh.");
      console.error("Dashboard data error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile?.id]);

  const handleSubmitNotice = async () => {
    setNoticeMessage(null);
    if (!profile?.id) return;

    if (!selectedMeetingId) {
      setNoticeMessage({ text: "Please select a meeting.", ok: false });
      return;
    }
    if (!noticeReason.trim()) {
      setNoticeMessage({ text: "Please provide a reason / excuse.", ok: false });
      return;
    }

    setSubmittingNotice(true);

    const { success, error } = await setPreMeetingNotice(
      selectedMeetingId,
      profile.id,
      noticeReason.trim()
    );

    if (error) {
      setNoticeMessage({ text: "Failed to submit excuse: " + error, ok: false });
    } else if (success) {
      setNoticeMessage({ text: "Absence / excuse notice recorded successfully.", ok: true });
      setNoticeReason("");
      setSelectedMeetingId("");
      loadDashboardData();
    }
    setSubmittingNotice(false);
  };

  // Helper formatting for 12-hour format display
  const formatTimeStr = (time24: string | null) => {
    if (!time24) return "—";
    const [hoursStr, minutesStr] = time24.split(":");
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  // Maps meeting type to a club domain color class
  const getMeetingDomain = (type: string): string | null => {
    const t = type.toLowerCase();
    if (t === "technical") return "technical";
    if (t === "creatives") return "creatives";
    if (t === "outreach") return "outreach";
    if (t === "club") return "operations";
    return null;
  };

  const pct = stats?.attendance_percentage ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile?.full_name || profile?.email || "Member"}!
        </h3>
        <p className="text-sm text-zinc-500">
          Here&apos;s a quick overview of your club attendance statistics.
        </p>
      </div>

      {dataError && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {dataError}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Total Meetings</h4>
          <p className="text-3xl font-bold text-zinc-950">
            {dataLoading ? (
              <span className="animate-pulse text-zinc-300">--</span>
            ) : (
              stats?.total_meetings ?? 0
            )}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Meetings Attended</h4>
          <p className="text-3xl font-bold text-zinc-950">
            {dataLoading ? (
              <span className="animate-pulse text-zinc-300">--</span>
            ) : (
              stats?.attended_meetings ?? 0
            )}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Attendance Rate</h4>
          <p className="text-3xl font-bold text-zinc-950">
            {dataLoading ? (
              <span className="animate-pulse text-zinc-300">--%</span>
            ) : pct !== null ? (
              `${pct}%`
            ) : (
              "0%"
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden h-fit">
          <div className="p-6 pb-4 border-b border-zinc-100">
            <h3 className="font-semibold leading-none tracking-tight">Recent Attendance History</h3>
          </div>
          <div className="p-6">
            {dataLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="space-y-2">
                      <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-2 w-24 bg-zinc-100 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-zinc-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">
                No attendance records yet. Attend a meeting to see your history here.
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between pb-4 ${
                      idx < history.length - 1 ? "border-b border-zinc-100" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-zinc-950">
                        {item.meetings?.title || "Club Meeting"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {new Date(item.scanned_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div
                      className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                        item.status === "present"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : item.status === "excused"
                          ? "text-blue-700 bg-blue-50 border-blue-200"
                          : "text-red-700 bg-red-50 border-red-200"
                      }`}
                    >
                      {item.status === "present" ? "Present" : item.status === "excused" ? "Excused" : "Absent"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Absence / Excuse Submission Section */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4 h-fit">
          <div className="border-b pb-3 flex items-start justify-between">
            <div>
              <h3 className="font-semibold leading-none tracking-tight text-zinc-950">Absence & Excuse Notice</h3>
              <p className="text-xs text-zinc-500 mt-1.5">
                Mark yourself absent for an upcoming meeting or submit an excuse for a meeting you missed.
              </p>
            </div>
            <span className="bg-amber-50 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-200 inline-block flex-shrink-0">
              Excused on Close
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Select Meeting *
              </label>
              {eligibleMeetings.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-1">
                  No upcoming meetings or missed meetings found to submit notice/excuses for.
                </p>
              ) : (
                <select
                  value={selectedMeetingId}
                  onChange={(e) => setSelectedMeetingId(e.target.value)}
                  disabled={submittingNotice}
                  className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                >
                  <option value="">— Choose a meeting —</option>
                  {eligibleMeetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.type}) · {m.status === "closed" ? "Closed (Missed)" : "Upcoming"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Reason / Excuse *
              </label>
              <textarea
                placeholder="Reason for missing the meeting..."
                value={noticeReason}
                onChange={(e) => setNoticeReason(e.target.value)}
                disabled={submittingNotice || eligibleMeetings.length === 0}
                rows={3}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-none"
              />
            </div>

            {noticeMessage && (
              <div
                className={`p-3 rounded-lg text-sm border ${
                  noticeMessage.ok
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {noticeMessage.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmitNotice}
                disabled={submittingNotice || eligibleMeetings.length === 0}
                className="rounded-xl bg-[#14213D] hover:bg-[#1f3357] w-full lg:w-auto"
              >
                {submittingNotice ? "Submitting..." : "Submit Notice"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Past Meetings Archives */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-bold tracking-tight text-zinc-950">Past Meetings & MOM Archives</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Review agenda, schedule details, and minutes of previous club sessions.
          </p>
        </div>

        {dataLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-zinc-50 rounded-xl border animate-pulse" />
            ))}
          </div>
        ) : closedMeetings.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4">No past closed meetings available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 max-h-[380px] overflow-y-auto pr-2">
            {closedMeetings.map((meeting) => {
              const domain = getMeetingDomain(meeting.type);
              return (
                <div key={meeting.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-zinc-900 text-sm leading-snug">{meeting.title}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${domain ? getDomainColorClass(domain as any) : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                        {meeting.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 font-medium">
                      {meeting.date ? new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      {" • "}
                      {formatTimeStr(meeting.start_time)} – {formatTimeStr(meeting.end_time)}
                    </p>

                    {meeting.agenda && (
                      <p className="text-xs text-zinc-600 line-clamp-3 bg-white p-2.5 rounded-lg border border-zinc-100">
                        <strong className="text-[10px] uppercase text-zinc-400 block mb-0.5">Agenda:</strong>
                        {meeting.agenda}
                      </p>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    {meeting.mom_url ? (
                      <a
                        href={meeting.mom_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                      >
                        <FileText size={14} /> View MOM
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">No MOM uploaded</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}