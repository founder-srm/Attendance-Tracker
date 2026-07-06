"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type AttendanceStats = {
  total_meetings: number;
  attended_meetings: number;
  missed_meetings: number;
  attendance_percentage: number;
};

type HistoryItem = {
  id: string;
  scanned_at: string;
  meetings: { title: string; type: string } | null;
};

export default function DashboardPage() {
  const { profile } = useAuth();

  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();

    const fetchData = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        // 1. Fetch per-user stats from the member_attendance_stats view.
        //    This view is defined in backend-setup/backend/supabase/views/.
        //    If it hasn't been run in Supabase yet, statsData will be null.
        const { data: statsData, error: statsError } = await supabase
          .from("member_attendance_stats")
          .select("total_meetings, attended_meetings, missed_meetings, attendance_percentage")
          .eq("user_id", profile.id)
          .single();

        if (statsError && statsError.code !== "PGRST116") {
          // PGRST116 = "no rows" — fine for a new user. Other errors are real.
          console.error("Stats fetch error:", statsError.message);
        } else {
          setStats(statsData);
        }

        // 2. Fetch recent attendance records joined with meeting details.
        const { data: historyData, error: histError } = await supabase
          .from("attendance")
          .select("id, scanned_at, meetings(title, type)")
          .eq("user_id", profile.id)
          .order("scanned_at", { ascending: false })
          .limit(5);

        if (histError) {
          console.error("History fetch error:", histError.message);
        } else {
          setHistory((historyData as unknown as HistoryItem[]) || []);
        }
      } catch (err) {
        setDataError("Could not load attendance data. Please refresh.");
        console.error("Dashboard data error:", err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [profile?.id]);

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

      {/* Recent Activity */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
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
                  <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Present
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}