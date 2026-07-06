"use client";

import { exportToExcel } from "@/lib/exportExcel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMeetings, getMembers } from "@/lib/store";

export function AdminDashboard() {
  const meetings = getMeetings();
  const members = getMembers();

  const today = new Date().toDateString();

  const todaysMeetings = meetings.filter(
    (meeting) => new Date(meeting.date).toDateString() === today
  );

  return (
    <div className="space-y-8">

      {/* Header */}

      <div>
        <h2 className="text-4xl font-bold">
          Admin Dashboard
        </h2>

        <p className="text-gray-500 mt-2">
          Welcome! Manage meetings, members and attendance from here.
        </p>
      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Total Meetings</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {meetings.length}
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Total Members</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {members.length}
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Attendance</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            --
          </h3>
          <p className="text-xs text-gray-400 mt-2">
            Coming Soon
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Today's Meetings</p>
          <h3 className="text-4xl font-bold mt-2 text-gray-900">
            {todaysMeetings.length}
          </h3>
        </div>

      </div>

      {/* Quick Actions */}

      <div className="bg-white rounded-xl border border-gray-200 p-6">

        <h3 className="text-2xl font-semibold mb-5">
          Quick Actions
        </h3>

        <div className="flex flex-wrap gap-4">

          <Link href="/admin/meetings">
            <Button>Create Meeting</Button>
          </Link>

          <Link href="/admin/members">
            <Button variant="outline">
              Manage Members
            </Button>
          </Link>
          

          <Button
            variant="outline"
            onClick={exportToExcel}
          >
            Export Excel
          </Button>

        </div>

      </div>

      {/* Recent Meetings */}

      <div className="bg-white rounded-xl border border-gray-200 p-6">

        <h3 className="text-2xl font-semibold mb-5">
          Recent Meetings
        </h3>

        {meetings.length === 0 ? (
          <p className="text-gray-500">
            No meetings created yet.
          </p>
        ) : (
          <div className="space-y-4">
            {meetings
              .slice()
              .reverse()
              .slice(0, 5)
              .map((meeting) => (
                <div
                  key={meeting.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-lg">
                    {meeting.title}
                  </h4>

                  <p className="text-gray-500">
                    {new Date(meeting.date).toLocaleDateString()}
                  </p>

                  <p className="text-gray-400 text-sm">
                    {meeting.startTime} - {meeting.endTime}
                  </p>
                </div>
              ))}
          </div>
        )}

      </div>

    </div>
  );
}