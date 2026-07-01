"use client";

import { MeetingManagement } from "@/components/MeetingManagement";

export default function MeetingsPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#14213D] mb-8">
          Meeting Management
        </h1>

        <MeetingManagement />
      </div>
    </div>
  );
}