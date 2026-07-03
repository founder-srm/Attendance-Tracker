"use client";

import { useAuth } from "@/components/AuthProvider";

export default function DashboardPage() {
  const { profile, loading } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile?.full_name || profile?.email || "Member"}!
        </h3>
        <p className="text-sm text-zinc-500">Here's a quick overview of your club attendance statistics.</p>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Total Meetings</h4>
          <p className="text-3xl font-bold text-zinc-950">--</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Meetings Attended</h4>
          <p className="text-3xl font-bold text-zinc-950">--</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Attendance Rate</h4>
          <p className="text-3xl font-bold text-zinc-950">--%</p>
        </div>
      </div>

      {/* Recent Activity Skeleton (To be populated by Person 4) */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 pb-4 border-b border-zinc-100">
          <h3 className="font-semibold leading-none tracking-tight">Recent Activity History</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none text-zinc-950">Club Meeting - Tech Domain</p>
                <p className="text-sm text-zinc-500">June 8, 2026</p>
              </div>
              <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Present
              </div>
            </div>
            
            <div className="flex items-center justify-between pb-2">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none text-zinc-950">General Club Meet</p>
                <p className="text-sm text-zinc-500">June 1, 2026</p>
              </div>
              <div className="text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                Absent
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}