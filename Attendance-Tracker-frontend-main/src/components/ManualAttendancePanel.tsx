"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { RoleBadge } from "@/components/RoleBadge";
import { getDomainColorClass } from "@/lib/domainColors";

// ── Types ──────────────────────────────────────────────────────────────────────

type Meeting = {
  id: string;
  title: string;
  type: string;
  created_at: string;
};

type Member = {
  id: string;
  full_name: string;
  email: string;
  domain: string | null;
  position_title: string;
};

type MemberRow = Member & {
  attendanceRowId: string | null;
  status: "present" | "absent" | "excused" | null;
  pre_meeting_notice_status: "none" | "not_attending";
  pre_meeting_notice_reason: string | null;
};

export default function ManualAttendancePanel() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set()); // member IDs being saved
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Load all meetings ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchMeetings = async () => {
      setMeetingsLoading(true);
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, type, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Failed to load meetings: " + error.message);
      } else {
        setMeetings(data || []);
      }
      setMeetingsLoading(false);
    };

    fetchMeetings();
  }, [supabase]);

  // ── Load members + attendance for the selected meeting ─────────────────────

  const fetchMembersAndAttendance = useCallback(
    async (meetingId: string) => {
      setMembersLoading(true);
      setError(null);

      // 1. All members
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, domain, position_title")
        .order("full_name", { ascending: true });

      if (usersError) {
        setError("Failed to load members: " + usersError.message);
        setMembersLoading(false);
        return;
      }

      // 2. Existing attendance records for this meeting
      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("id, user_id, status, pre_meeting_notice_status, pre_meeting_notice_reason")
        .eq("meeting_id", meetingId);

      if (attError) {
        setError("Failed to load attendance: " + attError.message);
        setMembersLoading(false);
        return;
      }

      // 3. Merge: determine status per member
      const attMap = new Map(
        (attData || []).map((a) => [a.user_id, a])
      );

      const merged: MemberRow[] = (usersData || []).map((user) => {
        const att = attMap.get(user.id);
        return {
          ...user,
          attendanceRowId: att?.id ?? null,
          status: att?.status ?? null,
          pre_meeting_notice_status: att?.pre_meeting_notice_status ?? "none",
          pre_meeting_notice_reason: att?.pre_meeting_notice_reason ?? null
        };
      });

      setMembers(merged);
      setMembersLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (!selectedMeetingId) {
      setMembers([]);
      return;
    }
    fetchMembersAndAttendance(selectedMeetingId);
  }, [selectedMeetingId, fetchMembersAndAttendance]);

  // ── Show a transient toast message ─────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Toggle attendance for a member ─────────────────────────────────────────

  const handleToggle = async (member: MemberRow) => {
    if (!selectedMeetingId || !profile?.id) return;

    setSaving((prev) => new Set(prev).add(member.id));
    setError(null);

    try {
      if (member.status === "present") {
        // Mark absent/delete row
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("id", member.attendanceRowId!);

        if (error) throw error;

        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, attendanceRowId: null, status: null }
              : m
          )
        );
        showToast(`${member.full_name} marked absent`);
      } else {
        // Mark present
        const { data, error } = await supabase
          .from("attendance")
          .upsert(
            {
              meeting_id: selectedMeetingId,
              user_id: member.id,
              status: "present",
              source: "manual",
              marked_by: profile.id
            },
            { onConflict: "meeting_id,user_id" }
          )
          .select("id")
          .single();

        if (error) throw error;

        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, attendanceRowId: data?.id ?? null, status: "present" }
              : m
          )
        );
        showToast(`${member.full_name} marked present`);
      }
    } catch (err: unknown) {
      setError(
        `Failed to update attendance for ${member.full_name}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  };

  // ── Mark all present / all absent helpers ──────────────────────────────────

  const markAll = async (markPresent: boolean) => {
    if (!selectedMeetingId || !profile?.id || saving.size > 0) return;

    const targets = filteredMembers.filter((m) =>
      markPresent ? m.status !== "present" : m.status === "present"
    );
    if (targets.length === 0) return;

    // Process sequentially to respect rate limits
    for (const m of targets) {
      await handleToggle(m);
    }
  };

  // ── Derived stats & search ──────────────────────────────────────────────────

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = members.filter((m) => m.status === "present").length;
  const totalCount = members.length;
  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-2">
          Manual Attendance Marking
        </h3>
        <p className="text-sm text-zinc-500">
          Select a meeting to manually record member attendance. Changes are saved immediately.
          This is an admin-only feature — members cannot alter their own records here.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          ✓ {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Meeting Selector */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
        <label
          htmlFor="meeting-select"
          className="text-sm font-medium text-zinc-700"
        >
          Select Meeting
        </label>
        {meetingsLoading ? (
          <div className="h-10 bg-zinc-100 rounded-md animate-pulse" />
        ) : meetings.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No meetings found. Create a meeting first.
          </p>
        ) : (
          <select
            id="meeting-select"
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          >
            <option value="">— Choose a meeting —</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.type}) ·{" "}
                {new Date(m.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Members Table */}
      {selectedMeetingId && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden space-y-4">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="font-semibold text-zinc-950">
                {selectedMeeting?.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {membersLoading
                  ? "Loading…"
                  : `${presentCount} of ${totalCount} marked present`}
              </p>
            </div>

            {!membersLoading && totalCount > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving.size > 0}
                  onClick={() => markAll(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  disabled={saving.size > 0}
                  onClick={() => markAll(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Real-time search filter */}
          <div className="px-6">
            <input
              type="text"
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            />
          </div>

          {/* Rows */}
          {membersLoading ? (
            <div className="divide-y divide-zinc-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="space-y-2">
                    <div className="h-3 w-36 bg-zinc-100 rounded animate-pulse" />
                    <div className="h-2 w-48 bg-zinc-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-28 bg-zinc-100 rounded-md animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">
              No matching members found.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredMembers.map((member) => {
                const isPresent = member.status === "present";
                const isExcused = member.status === "excused";
                const isSaving = saving.has(member.id);

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    {/* Member info with Badge + Domain color pill */}
                    <div className="min-w-0 flex items-center gap-2">
                      <RoleBadge position={member.position_title} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-950 truncate flex items-center gap-2">
                          <span>{member.full_name}</span>
                          {member.domain && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getDomainColorClass(
                                member.domain
                              )}`}
                            >
                              {member.domain}
                            </span>
                          )}
                          {member.pre_meeting_notice_status === "not_attending" && (
                            <span
                              title={member.pre_meeting_notice_reason || "Pre-meeting absent notice"}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 animate-pulse cursor-help"
                            >
                              ⚠️ Notice: {member.pre_meeting_notice_reason || "Not Attending"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {/* Status + toggle */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Status badge */}
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                          isPresent
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : isExcused
                            ? "text-blue-700 bg-blue-50 border-blue-200"
                            : "text-zinc-400 bg-zinc-50 border-zinc-200"
                        }`}
                      >
                        {isPresent ? "Present" : isExcused ? "Excused" : "Absent"}
                      </span>

                      {/* Toggle button */}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleToggle(member)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 ${
                          isPresent
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isSaving
                          ? "Saving…"
                          : isPresent
                            ? "Mark Absent"
                            : "Mark Present"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
