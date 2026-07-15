"use client";

import { useEffect, useMemo, useState } from "react";
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

  // Interactive search & filter for attendance history
  const [searchText, setSearchText] = useState("");
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "present" | "absent" | "excused"
  >("all");

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
        .order("scanned_at", { ascending: false });

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

  // Filtered history for interactive search & filter
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter =
        historyFilter === "all" || item.status === historyFilter;
      const matchesSearch =
        !searchText.trim() ||
        (item.meetings?.title || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [history, historyFilter, searchText]);

  // Monthly bar chart data (last 6 months)
  const monthlyChartData = useMemo(() => {
    if (history.length === 0) return [];
    const now = new Date();
    const months: { label: string; month: number; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return months.map(({ label, month, year }) => {
      const inMonth = history.filter((r) => {
        const d = new Date(r.scanned_at);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return {
        label,
        present: inMonth.filter((r) => r.status === "present").length,
        total: inMonth.length,
      };
    });
  }, [history]);

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

      {/* Attendance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart — Attendance Rate */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center gap-3">
          <h4 className="text-sm font-medium text-zinc-500">Attendance Rate</h4>
          {dataLoading ? (
            <div className="w-[140px] h-[140px] rounded-full border-[10px] border-zinc-100 animate-pulse" />
          ) : (() => {
            const rate = pct ?? 0;
            const r = 40;
            const circ = 2 * Math.PI * r;
            const dash = (rate / 100) * circ;
            const color =
              rate >= 75 ? "#16a34a" : rate >= 50 ? "#d4a017" : "#ef4444";
            return (
              <svg viewBox="0 0 100 100" width="140" height="140">
                <circle
                  cx="50" cy="50" r={r}
                  fill="none" stroke="#e4e4e7" strokeWidth="10"
                />
                <circle
                  cx="50" cy="50" r={r}
                  fill="none" stroke={color} strokeWidth="10"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={circ / 4}
                  strokeLinecap="round"
                  style={{
                    transition:
                      "stroke-dasharray 0.8s cubic-bezier(.23,1,.32,1)",
                  }}
                />
                <text
                  x="50" y="47" textAnchor="middle"
                  fill="#09090b" fontSize="16" fontWeight="700"
                >
                  {rate}%
                </text>
                <text
                  x="50" y="60" textAnchor="middle"
                  fill="#a1a1aa" fontSize="8"
                >
                  ATTENDANCE
                </text>
              </svg>
            );
          })()}
          <p className="text-xs text-zinc-400">
            {(pct ?? 0) >= 75
              ? "Great standing! Keep it up."
              : "Below 75% — try not to miss meetings."}
          </p>
        </div>

        {/* Bar Chart — Monthly Check-ins */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-4">
            Monthly Check-ins
          </h4>
          {dataLoading ? (
            <div className="h-[140px] bg-zinc-50 rounded-lg animate-pulse" />
          ) : monthlyChartData.length === 0 ||
            monthlyChartData.every((d) => d.total === 0) ? (
            <p className="text-xs text-zinc-400 text-center py-10">
              No attendance data to chart yet.
            </p>
          ) : (
            <div className="flex items-end gap-2 h-[140px]">
              {monthlyChartData.map((d, i) => {
                const maxVal = Math.max(
                  ...monthlyChartData.map((m) => m.total),
                  1
                );
                const barPct =
                  d.total > 0 ? (d.present / maxVal) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                      {d.present}/{d.total}
                    </span>
                    <div className="w-full flex flex-col justify-end h-[96px]">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{
                          height: `${barPct}%`,
                          minHeight: d.present > 0 ? 4 : 0,
                          transition:
                            "height 0.6s cubic-bezier(.23,1,.32,1)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 tracking-wide uppercase">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History with Search & Filters */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden h-fit">
          <div className="p-6 pb-4 border-b border-zinc-100">
            <h3 className="font-semibold leading-none tracking-tight">
              Attendance History
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Full record of your meeting attendance.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search meetings…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-9 flex-1 min-w-[160px] rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
              {(["all", "present", "absent", "excused"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    historyFilter === f
                      ? f === "present"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : f === "absent"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : f === "excused"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "present"
                    ? "✓ Present"
                    : f === "absent"
                    ? "✗ Absent"
                    : "⊘ Excused"}
                </button>
              ))}
              <span className="ml-auto text-xs text-zinc-400 font-mono tabular-nums">
                {filteredHistory.length} records
              </span>
            </div>

            {/* Records List */}
            {dataLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-zinc-100 pb-4"
                  >
                    <div className="space-y-2">
                      <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-2 w-24 bg-zinc-100 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-zinc-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">
                {history.length === 0
                  ? "No attendance records yet. Attend a meeting to see your history here."
                  : "No records match your search or filter."}
              </p>
            ) : (
              <div className="space-y-0 max-h-[320px] overflow-y-auto pr-1">
                {filteredHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between py-3.5 ${
                      idx < filteredHistory.length - 1
                        ? "border-b border-zinc-100"
                        : ""
                    } hover:bg-zinc-50/50 -mx-2 px-2 rounded transition`}
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
                      {item.status === "present"
                        ? "Present"
                        : item.status === "excused"
                        ? "Excused"
                        : "Absent"}
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