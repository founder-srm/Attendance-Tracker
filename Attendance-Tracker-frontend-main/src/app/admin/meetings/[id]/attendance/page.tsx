"use client";

import { AttendanceManagement } from "@/components/AttendanceManagement";

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-[#14213D] mb-6">
        Manual Attendance
      </h1>

      <AttendanceManagement />
    </div>
  );
}