"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMeetings, type Meeting } from "@/services/meetings";
import { getUsers } from "@/services/members";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const [meetingsResult, usersResult] = await Promise.all([
        getMeetings(),
        getUsers(),
      ]);

      if (meetingsResult.error) {
        setError("Could not load meetings: " + meetingsResult.error);
      } else {
        setMeetings(meetingsResult.data ?? []);
      }

      if (!usersResult.error) {
        setMemberCount(usersResult.data?.length ?? 0);
      }

      setLoading(false);
    };

    load();
  }, []);

  const today = new Date().toDateString();

  const todaysMeetings = meetings.filter(
    (m) => new Date(m.created_at).toDateString() === today
  );

  const recentMeetings = meetings.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-bold">Admin Dashboard</h2>
        <p className="text-gray-500 mt-2">
          Welcome, {profile?.full_name || "Admin"}! Manage meetings, members and
          attendance from here.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Total Meetings</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {loading ? (
              <span className="animate-pulse text-gray-300">—</span>
            ) : (
              meetings.length
            )}
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Total Members</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {loading ? (
              <span className="animate-pulse text-gray-300">—</span>
            ) : (
              memberCount ?? "—"
            )}
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Created Today</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {loading ? (
              <span className="animate-pulse text-gray-300">—</span>
            ) : (
              todaysMeetings.length
            )}
          </h3>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-2xl font-semibold mb-5">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link href="/admin/meetings">
            <Button>Create Meeting</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline">Manage Members</Button>
          </Link>
          <Link href="/admin/attendance">
            <Button variant="outline">Manual Attendance</Button>
          </Link>
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-2xl font-semibold mb-5">Recent Meetings</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentMeetings.length === 0 ? (
          <p className="text-gray-500">No meetings created yet.</p>
        ) : (
          <div className="space-y-4">
            {recentMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="border border-gray-200 rounded-lg p-4 flex items-start justify-between"
              >
                <div>
                  <h4 className="font-semibold text-lg">{meeting.title}</h4>
                  <p className="text-gray-500 text-sm">{meeting.type}</p>
                  {meeting.agenda && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                      {meeting.agenda}
                    </p>
                  )}
                </div>
                <p className="text-gray-400 text-xs whitespace-nowrap ml-4">
                  {new Date(meeting.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}