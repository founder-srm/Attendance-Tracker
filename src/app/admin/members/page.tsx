"use client";

import { MemberManagement } from "@/components/MemberManagement";

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] py-8">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#14213D] mb-8">
          Member Management
        </h1>

        <MemberManagement />
      </div>
    </div>
  );
}