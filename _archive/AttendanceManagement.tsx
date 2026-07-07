"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getMeetings, getMembers } from "@/lib/store";

export function AttendanceManagement() {
  const meetings = getMeetings();
  const members = getMembers();

  const [selectedMeeting, setSelectedMeeting] = useState("");
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const handleStatus = (memberId: string, present: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: present,
    }));
  };

  const handleSave = () => {
    if (!selectedMeeting) {
      alert("Please select a meeting.");
      return;
    }

    console.log({
      meetingId: selectedMeeting,
      attendance,
    });

    alert("Attendance saved successfully!");
  };

  return (
    <div className="space-y-6">

      {/* Meeting Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-[#14213D] mb-4">
          Select Meeting
        </h2>

        <select
          className="w-full border rounded-lg p-3"
          value={selectedMeeting}
          onChange={(e) => setSelectedMeeting(e.target.value)}
        >
          <option value="">Choose a meeting</option>

          {meetings.map((meeting) => (
            <option key={meeting.id} value={meeting.id}>
              {meeting.title}
            </option>
          ))}
        </select>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-[#14213D] mb-4">
          Mark Attendance
        </h2>

        {members.length === 0 ? (
          <p>No members found.</p>
        ) : (
          <div className="space-y-4">

            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between border rounded-lg p-4"
              >
                <div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>

                <div className="flex gap-3">

                  <Button
                    variant={
                      attendance[member.id] === true
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleStatus(member.id, true)}
                  >
                    Present
                  </Button>

                  <Button
                    variant={
                      attendance[member.id] === false
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() => handleStatus(member.id, false)}
                  >
                    Absent
                  </Button>

                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      <Button onClick={handleSave}>
        Save Attendance
      </Button>

    </div>
  );
}