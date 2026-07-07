"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Play,
  QrCode,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDomainColorClass } from "@/lib/domainColors";
import {
  closeMeeting,
  createMeeting,
  deleteMeeting,
  getMeetingRoster,
  getMeetings,
  type Meeting,
  type MeetingType,
  type RosterMember,
  startMeetingNow,
  updateMeeting,
  uploadMomDocument,
} from "@/services/meetings";
import QRDisplay from "./QRDisplay";

const MEETING_TYPES: MeetingType[] = [
  "Club",
  "Technical",
  "Creatives",
  "Outreach",
  "Event",
  "Other",
];

export function MeetingManagement() {
  const { profile } = useAuth();

  // ── List state ──────────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MeetingType>("Club");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // e.g. "17:00"
  const [endTime, setEndTime] = useState(""); // e.g. "19:00"
  const [agenda, setAgenda] = useState("");

  // ── Submission state ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  // ── Modals state ────────────────────────────────────────────────────────────
  const [qrModalMeeting, setQrModalMeeting] = useState<Meeting | null>(null);
  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const [rosterModalMeeting, setRosterModalMeeting] = useState<Meeting | null>(
    null,
  );
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // ── Load meetings on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setListLoading(true);
    setListError(null);
    const { data, error } = await getMeetings();
    if (error) {
      setListError("Failed to load meetings: " + error);
    } else {
      setMeetings(data ?? []);
    }
    setListLoading(false);
  };

  // ── Load roster when selected meeting changes ──────────────────────────────
  useEffect(() => {
    if (rosterModalMeeting) {
      loadRoster(rosterModalMeeting.id);
    } else {
      setRoster([]);
    }
  }, [rosterModalMeeting]);

  const loadRoster = async (meetingId: string) => {
    setRosterLoading(true);
    setRosterError(null);
    const { data, error } = await getMeetingRoster(meetingId);
    if (error) {
      setRosterError(error);
    } else {
      setRoster(data ?? []);
    }
    setRosterLoading(false);
  };

  // ── Submit creation/update ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!title.trim() || !date) {
      setFormMessage({ text: "Title and Date are required.", ok: false });
      return;
    }
    if (!profile?.id) {
      setFormMessage({ text: "Auth session error.", ok: false });
      return;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      type,
      time_limit_minutes: 60,
      agenda: agenda.trim() || null,
      date,
      start_time: startTime || null,
      end_time: endTime || null,
    };

    let result;
    if (editingId) {
      result = await updateMeeting(editingId, payload);
    } else {
      result = await createMeeting({
        ...payload,
        created_by: profile.id,
      });
    }

    if (result.error) {
      setFormMessage({ text: "Error: " + result.error, ok: false });
    } else {
      setFormMessage({
        text: editingId
          ? "Meeting updated successfully!"
          : "Meeting scheduled successfully!",
        ok: true,
      });
      // Clear form
      setTitle("");
      setType("Club");
      setDate("");
      setStartTime("");
      setEndTime("");
      setAgenda("");
      setEditingId(null);
      // Reload list
      loadMeetings();
    }
    setSubmitting(false);
  };

  // ── Edit Mode ───────────────────────────────────────────────────────────────
  const startEdit = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setTitle(meeting.title);
    setType(meeting.type);
    setDate(meeting.date || "");
    setStartTime(meeting.start_time || "");
    setEndTime(meeting.end_time || "");
    setAgenda(meeting.agenda || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setType("Club");
    setDate("");
    setStartTime("");
    setEndTime("");
    setAgenda("");
    setFormMessage(null);
  };

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleStartNow = async (meetingId: string) => {
    const { data, error } = await startMeetingNow(meetingId);
    if (error) {
      alert("Failed to start meeting: " + error);
    } else if (data) {
      loadMeetings();
    }
  };

  const handleCloseMeeting = async (meetingId: string) => {
    if (
      !confirm(
        "Are you sure you want to close this meeting? This will automatically mark all expected members who did not check in as absent.",
      )
    ) {
      return;
    }
    const { success, error } = await closeMeeting(meetingId);
    if (error) {
      alert("Failed to close meeting: " + error);
    } else if (success) {
      loadMeetings();
      alert("Meeting closed and absences recorded.");
    }
  };

  // ── Upload MOM ─────────────────────────────────────────────────────────────
  const handleMomUpload = async (meetingId: string, file: File) => {
    const { url, error } = await uploadMomDocument(meetingId, file);
    if (error) {
      alert("Upload failed: " + error);
    } else if (url) {
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, mom_url: url } : m)),
      );
      alert("MOM uploaded successfully!");
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    const { error } = await deleteMeeting(id);
    if (error) {
      alert("Delete failed: " + error);
    } else {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
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

  // Grouped members for Roster Modal
  const presentMembers = roster.filter((m) => m.status === "present");
  const excusedMembers = roster.filter((m) => m.status === "excused");
  const absentMembers = roster.filter((m) => m.status === "absent");

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Form ── */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10">
        <h2 className="text-4xl font-extrabold text-[#14213D] mb-8">
          {editingId ? "Edit Meeting" : "Create New Meeting"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#14213D] mb-2">
              Meeting Title *
            </label>
            <Input
              placeholder="e.g. Weekly Club Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-[#14213D] mb-2">
              Meeting Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MeetingType)}
              className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-[#14213D] mb-2">
              Date *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start Time */}
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

          {/* End Time */}
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

          {/* Agenda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#14213D] mb-2">
              Agenda
            </label>
            <textarea
              placeholder="What will you discuss?"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-none h-24"
            />
          </div>
        </div>

        {formMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm border ${
              formMessage.ok
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {formMessage.text}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={cancelEdit}
              className="rounded-xl"
            >
              Cancel Edit
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-[#14213D] hover:bg-[#1f3357] text-white"
          >
            {submitting
              ? "Submitting..."
              : editingId
                ? "Save Changes"
                : "Schedule Meeting"}
          </Button>
        </div>
      </div>

      {/* ── List ── */}
      <h2 className="text-3xl font-extrabold text-[#14213D] border-b pb-3">
        Scheduled Meetings
      </h2>

      {listError && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {listError}
        </div>
      )}

      {listLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-gray-100 p-6 h-60 animate-pulse"
            />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center">
          <p className="text-gray-500 text-lg">No meetings scheduled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => {
            const isOpen = meeting.status !== "closed";

            return (
              <div
                key={meeting.id}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-[#14213D] truncate pr-2">
                      {meeting.title}
                    </h3>
                    {/* QR Icon Placeholder */}
                    <button
                      onClick={() => setQrModalMeeting(meeting)}
                      title="Show QR Code"
                      className="p-1.5 text-[#14213D] hover:bg-zinc-100 rounded-lg border border-zinc-200 transition"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
                      {meeting.type}
                    </span>
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isOpen
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {meeting.status || "open"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-zinc-600 mb-5">
                    <div>
                      <span className="font-semibold text-[#14213D]">
                        Date:{" "}
                      </span>
                      {meeting.date
                        ? new Date(meeting.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div>
                      <span className="font-semibold text-[#14213D]">
                        Scheduled:{" "}
                      </span>
                      {formatTimeStr(meeting.start_time)} -{" "}
                      {formatTimeStr(meeting.end_time)}
                    </div>
                    {meeting.actual_start_at && (
                      <div className="text-emerald-700 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                        Started:{" "}
                        {new Date(meeting.actual_start_at).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    )}
                    {meeting.agenda && (
                      <p className="text-zinc-400 text-xs mt-2 line-clamp-2">
                        {meeting.agenda}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  {/* Actions (Start Now / Close) */}
                  <div className="flex gap-2">
                    {isOpen && !meeting.actual_start_at && (
                      <Button
                        onClick={() => handleStartNow(meeting.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1 h-9 text-xs"
                      >
                        <Play size={14} /> Start NOW
                      </Button>
                    )}
                    {isOpen && (
                      <Button
                        onClick={() => handleCloseMeeting(meeting.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-1 h-9 text-xs"
                      >
                        <CheckCircle2 size={14} /> Close
                      </Button>
                    )}
                  </div>

                  {/* MOM Upload / View Button */}
                  <div>
                    {meeting.mom_url ? (
                      <div className="flex gap-2 w-full">
                        <a
                          href={meeting.mom_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center"
                        >
                          <Button
                            variant="outline"
                            className="w-full rounded-xl flex items-center justify-center gap-1 text-xs h-10"
                          >
                            <FileText size={14} /> View MOM
                          </Button>
                        </a>
                        <label className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 h-10 transition-colors">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMomUpload(meeting.id, file);
                            }}
                          />
                          Replace
                        </label>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 h-10 transition-colors gap-1.5">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMomUpload(meeting.id, file);
                          }}
                        />
                        <FileUp size={14} /> Upload MOM
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setRosterModalMeeting(meeting)}
                      className="rounded-xl border-zinc-900 text-zinc-950 hover:bg-zinc-100 h-10 text-xs flex items-center justify-center gap-1"
                    >
                      <Users size={14} /> Roster
                    </Button>

                    <Link href="/admin/attendance" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full rounded-xl border-[#14213D] text-[#14213D] h-10 text-xs"
                      >
                        Manual Mark
                      </Button>
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => startEdit(meeting)}
                      className="flex-1 h-9 rounded-xl border-zinc-300 text-zinc-700 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(meeting.id)}
                      className="flex-1 h-9 rounded-xl text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {qrModalMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-zinc-100 mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-[#14213D]">
                  Meeting QR Code
                </h3>
                <p className="text-zinc-500 text-xs mt-1 pr-4">
                  Attendance for:{" "}
                  <strong className="text-zinc-800">
                    {qrModalMeeting.title}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setQrModalMeeting(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 bg-zinc-100 rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center justify-center min-h-[320px]">
              {qrModalMeeting.status === "closed" ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 p-4">
                  <span className="text-4xl">🚫</span>
                  <p className="text-sm font-semibold text-zinc-700 font-serif">
                    Meeting is Closed
                  </p>
                  <p className="text-xs text-zinc-400 max-w-[220px]">
                    The attendance window is closed. No QR code is available.
                  </p>
                </div>
              ) : !qrModalMeeting.actual_start_at ? (
                <div className="flex flex-col items-center justify-center text-center gap-4 p-4 w-full">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs leading-relaxed max-w-[280px]">
                    This meeting has not started yet. You need to start the
                    meeting to begin displaying the QR code.
                  </div>
                  <Button
                    onClick={async () => {
                      const { data, error } = await startMeetingNow(
                        qrModalMeeting.id,
                      );
                      if (error) {
                        alert("Failed to start meeting: " + error);
                      } else if (data) {
                        await loadMeetings();
                        setQrModalMeeting(data);
                      }
                    }}
                    className="w-full max-w-[280px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 h-10 font-semibold"
                  >
                    <Play size={16} /> Start NOW & Show QR
                  </Button>
                </div>
              ) : (
                <QRDisplay
                  key={qrRefreshKey}
                  meetingId={qrModalMeeting.id}
                  windowMinutes={qrModalMeeting.time_limit_minutes}
                  actualStartAt={qrModalMeeting.actual_start_at}
                />
              )}
            </div>

            <div className="mt-6 flex justify-between gap-3">
              {qrModalMeeting.actual_start_at &&
                qrModalMeeting.status !== "closed" && (
                  <Button
                    type="button"
                    onClick={() => setQrRefreshKey((prev) => prev + 1)}
                    className="flex-1 rounded-xl bg-zinc-950 text-white hover:bg-zinc-900 h-10 text-xs font-semibold"
                  >
                    Refresh QR Code
                  </Button>
                )}
              <Button
                onClick={() => setQrModalMeeting(null)}
                variant={
                  qrModalMeeting.actual_start_at &&
                  qrModalMeeting.status !== "closed"
                    ? "outline"
                    : "default"
                }
                className="flex-1 rounded-xl h-10 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Roster Modal (Admin-2) ── */}
      {rosterModalMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-zinc-100 mx-4 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-[#14213D]">
                  Attendance Roster
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  Roster reports for:{" "}
                  <strong className="text-zinc-800">
                    {rosterModalMeeting.title}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setRosterModalMeeting(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 bg-zinc-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {rosterLoading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-zinc-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : rosterError ? (
                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Failed to load roster: {rosterError}</span>
                </div>
              ) : (
                <>
                  {/* Summary Counters */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-center">
                      <p className="text-[9px] font-semibold text-zinc-500 uppercase">
                        Roster Total
                      </p>
                      <p className="text-lg font-bold text-zinc-950">
                        {roster.length}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                      <p className="text-[9px] font-semibold text-emerald-600 uppercase">
                        Present
                      </p>
                      <p className="text-lg font-bold text-emerald-700">
                        {presentMembers.length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                      <p className="text-[9px] font-semibold text-blue-600 uppercase">
                        Excused
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        {excusedMembers.length}
                      </p>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-center">
                      <p className="text-[9px] font-semibold text-red-600 uppercase">
                        Absent
                      </p>
                      <p className="text-lg font-bold text-red-700">
                        {absentMembers.length}
                      </p>
                    </div>
                  </div>

                  {/* 1. Present Members list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border-b border-emerald-200 px-3 py-1.5 rounded">
                      Present ({presentMembers.length})
                    </h4>
                    {presentMembers.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic px-3 py-1">
                        No attendees present yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-zinc-100 bg-white rounded-lg border border-zinc-100">
                        {presentMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between py-2 px-3 hover:bg-zinc-50 transition rounded-lg"
                          >
                            <div className="flex items-center gap-2.5">
                              <RoleBadge position={member.position_title} />
                              <div>
                                <p
                                  className={`text-sm font-semibold ${member.domain ? getDomainColorClass(member.domain) : "text-zinc-950"}`}
                                >
                                  {member.full_name}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                              present
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Excused Members list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider bg-blue-50 border-b border-blue-200 px-3 py-1.5 rounded">
                      Excused ({excusedMembers.length})
                    </h4>
                    {excusedMembers.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic px-3 py-1">
                        No members excused.
                      </p>
                    ) : (
                      <div className="divide-y divide-zinc-100 bg-white rounded-lg border border-zinc-100">
                        {excusedMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="py-2.5 px-3 hover:bg-zinc-50 transition rounded-lg space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <RoleBadge position={member.position_title} />
                                <div>
                                  <p
                                    className={`text-sm font-semibold ${member.domain ? getDomainColorClass(member.domain) : "text-zinc-950"}`}
                                  >
                                    {member.full_name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 uppercase tracking-wider">
                                excused
                              </span>
                            </div>

                            {/* Excuse Reason if submitted */}
                            {member.pre_meeting_notice_reason && (
                              <div className="ml-8 text-xs bg-amber-50 text-amber-900 border border-amber-200 p-2 rounded-lg">
                                <span className="font-semibold text-[10px] uppercase text-amber-800 block mb-0.5">
                                  Excuse Reason:
                                </span>
                                &ldquo;{member.pre_meeting_notice_reason}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Absent Members list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider bg-red-50 border-b border-red-200 px-3 py-1.5 rounded">
                      Absent ({absentMembers.length})
                    </h4>
                    {absentMembers.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic px-3 py-1">
                        No absences recorded.
                      </p>
                    ) : (
                      <div className="divide-y divide-zinc-100 bg-white rounded-lg border border-zinc-100">
                        {absentMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="py-2 px-3 hover:bg-zinc-50 transition rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <RoleBadge position={member.position_title} />
                                <div>
                                  <p
                                    className={`text-sm font-semibold ${member.domain ? getDomainColorClass(member.domain) : "text-zinc-950"}`}
                                  >
                                    {member.full_name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 uppercase tracking-wider">
                                absent
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 border-t pt-4 flex justify-end">
              <Button
                onClick={() => setRosterModalMeeting(null)}
                className="rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
