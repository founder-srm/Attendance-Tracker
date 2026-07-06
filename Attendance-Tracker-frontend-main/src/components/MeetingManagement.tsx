"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMeeting,
  getMeetings,
  deleteMeeting,
  updateMeeting,
} from "@/lib/store";
import type { Meeting } from "@/types/auth";

export function MeetingManagement() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

useEffect(() => {
  setMeetings(getMeetings());
}, []);

const handleAddMeeting = () => {
  setError("");
  setMessage("");

  if (!title.trim()) {
    setError("Meeting title is required.");
    return;
  }

  if (!date) {
    setError("Please select a meeting date.");
    return;
  }

  if (!startTime || !endTime) {
    setError("Please select start and end time.");
    return;
  }

  const newMeeting = createMeeting({
    title,
    description,
    date: new Date(date),
    startTime,
    endTime,
    location,
    createdBy: "admin@attendance.local",
  });

  setMeetings([...meetings, newMeeting]);

  setMessage("Meeting created successfully.");

  resetForm();
};

  const handleDeleteMeeting = (id: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      deleteMeeting(id);
      setMeetings(meetings.filter((m) => m.id !== id));
    }
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setTitle(meeting.title);
    setDescription(meeting.description);
    setDate(meeting.date.toISOString().split("T")[0]);
    setStartTime(meeting.startTime);
    setEndTime(meeting.endTime);
    setLocation(meeting.location);
  };

  const handleSaveEdit = (id: string) => {
  const updated = updateMeeting(id, {
    title,
    description,
    date: new Date(date),
    startTime,
    endTime,
    location,
  });

  if (updated) {
    setMeetings(
      meetings.map((m) => (m.id === id ? updated : m))
    );

    setEditingId(null);

    setMessage(" Meeting updated successfully.");

    resetForm();
  }
};

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10">
        <h2 className="text-4xl font-extrabold text-[#14213D] mb-8">
          {editingId ? "Edit Meeting" : "Create New Meeting"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    Meeting Title
  </label>
  <Input
    placeholder="Enter meeting title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />
</div>

<div>
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    Location
  </label>
  <Input
    placeholder="Enter meeting location"
    value={location}
    onChange={(e) => setLocation(e.target.value)}
  />
</div>

<div className="md:col-span-2">
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    Description
  </label>
  <Input
    placeholder="Enter meeting description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
</div>

<div>
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    Meeting Date
  </label>
  <Input
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
  />
</div>

<div>
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    Start Time
  </label>
  <Input
    type="time"
    value={startTime}
    onChange={(e) => setStartTime(e.target.value)}
  />
</div>

<div>
  <label className="block text-sm font-semibold text-[#14213D] mb-2">
    End Time
  </label>
  <Input
    type="time"
    value={endTime}
    onChange={(e) => setEndTime(e.target.value)}
  />
</div>
          <div className="md:col-span-2 flex gap-2">
            <Button
              onClick={editingId ? () => handleSaveEdit(editingId) : handleAddMeeting}
              className="flex-1 bg-[#14213D] hover:bg-[#1f3357] rounded-xl"
            >
              {editingId ? "Update Meeting" : "Create Meeting"}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}
                className="flex-1 bg-[#14213D] hover:bg-[#1f3357] rounded-xl"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {meetings.map((meeting) => (
    <div
      key={meeting.id}
      className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
    >
      <h3 className="text-xl font-bold text-[#14213D] mb-2">
        {meeting.title}
      </h3>

      <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full mt-2 mb-4">
       Upcoming
      </span>

      {meeting.description && (
        <p className="text-gray-500 text-sm mb-4">
          {meeting.description}
        </p>
      )}

      <div className="space-y-2 text-sm text-gray-600 mb-6">

        <div>
          <span className="font-semibold text-[#14213D]">
             Date:
          </span>{" "}
          {new Date(meeting.date).toLocaleDateString()}
        </div>

        <div>
          <span className="font-semibold text-[#14213D]">
             Time:
          </span>{" "}
          {meeting.startTime} - {meeting.endTime}
        </div>

        {meeting.location && (
          <div>
            <span className="font-semibold text-[#14213D]">
               Location:
            </span>{" "}
            {meeting.location}
          </div>
        )}

      </div>

      <div className="space-y-3">

        <Button
          className="w-full bg-[#14213D] hover:bg-[#0f1c35] rounded-xl"
        >
          Generate QR
        </Button>

        <Button
          variant="outline"
          className="w-full rounded-xl border-[#14213D] text-[#14213D]"
        >
          View Details
        </Button>
        
        <Button
          variant="outline"
          className="w-full rounded-xl"
        >
          Upload MOM
        </Button>
        

<Link href={`/admin/meetings/${meeting.id}/attendance`}>
  <Button
    variant="outline"
    className="w-full rounded-xl border-[#14213D] text-[#14213D]"
  >
    Manual Attendance
  </Button>
</Link>

      <div className="flex gap-4 mt-2">

  <Button
    variant="outline"
    onClick={() => handleEditMeeting(meeting)}
    className="flex-1 h-11 rounded-xl border-[#14213D] text-[#14213D]"
  >
    Edit
  </Button>

  <Button
    variant="destructive"
    onClick={() => handleDeleteMeeting(meeting.id)}
    className="flex-1 h-11 rounded-xl"
  >
    Delete
  </Button>

</div> 

      </div>
    </div>
  ))}
</div>

{meetings.length === 0 && !editingId && (
  <div className="bg-white border border-gray-200 rounded-3xl shadow-x1 p-12 text-center">
    <p className="text-gray-500 text-lg">
      No meetings scheduled yet.
    </p>
  </div>
)}
 </div>
  );
}