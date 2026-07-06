"use client";

import { createClient } from "@/lib/supabase/client";

// ── Types matching the actual Supabase meetings table + extensions ────────────────

export type MeetingType =
  | "Club"
  | "Technical"
  | "Creatives"
  | "Outreach"
  | "Event"
  | "Other";

export type MeetingStatus = "open" | "closed";

export type Meeting = {
  id: string;
  title: string;
  type: MeetingType;
  time_limit_minutes: number;
  agenda: string | null;
  mom_url: string | null;
  qr_payload: string | null;
  status: MeetingStatus;
  date: string | null; // format YYYY-MM-DD
  start_time: string | null; // e.g. "05:00 PM"
  end_time: string | null; // e.g. "07:00 PM"
  actual_start_at: string | null;
  created_by: string;
  created_at: string;
};

type MeetingInsert = {
  title: string;
  type: MeetingType;
  time_limit_minutes: number;
  agenda?: string | null;
  mom_url?: string | null;
  qr_payload?: string | null;
  status?: MeetingStatus;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  actual_start_at?: string | null;
  created_by: string;
};

type MeetingUpdate = Partial<Omit<MeetingInsert, "created_by">>;

// ── Client-side service functions ────────────────

export async function getMeetings(): Promise<{
  data: Meeting[] | null;
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as Meeting[]) || [], error: null };
}

export async function getMeeting(
  id: string
): Promise<{ data: Meeting | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Meeting, error: null };
}

export async function createMeeting(
  payload: MeetingInsert
): Promise<{ data: Meeting | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      ...payload,
      qr_payload: payload.qr_payload || `meeting-${crypto.randomUUID()}`
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Meeting, error: null };
}

export async function updateMeeting(
  id: string,
  updates: MeetingUpdate
): Promise<{ data: Meeting | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Meeting, error: null };
}

export async function deleteMeeting(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Start Meeting NOW - sets actual_start_at to current timestamp.
 */
export async function startMeetingNow(
  id: string
): Promise<{ data: Meeting | null; error: string | null }> {
  return updateMeeting(id, { actual_start_at: new Date().toISOString() });
}

/**
 * Helper to check if a user is expected at a meeting based on type/domain.
 */
function isUserExpected(meetingType: string, userDomain: string | null): boolean {
  const t = meetingType.toLowerCase();
  // All-club meeting types expect everyone
  if (t === "club" || t === "event" || t === "other") return true;
  if (!userDomain) return false;
  return t === userDomain.toLowerCase();
}

/**
 * Close Meeting - sets status to closed and triggers auto-absent logic for expected members.
 */
export async function closeMeeting(
  meetingId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  try {
    // 1. Fetch meeting info
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return { success: false, error: meetingError?.message || "Meeting not found" };
    }

    // 2. Set meeting status to closed
    const { error: closeError } = await supabase
      .from("meetings")
      .update({ status: "closed" })
      .eq("id", meetingId);

    if (closeError) {
      return { success: false, error: closeError.message };
    }

    // 3. Load all members
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, domain");

    if (usersError || !users) {
      return { success: false, error: usersError?.message || "Failed to load members" };
    }

    // 4. Load existing attendance rows for this meeting
    const { data: existingAttendance, error: attError } = await supabase
      .from("attendance")
      .select("*")
      .eq("meeting_id", meetingId);

    if (attError) {
      return { success: false, error: attError.message };
    }

    const attMap = new Map(existingAttendance?.map((a) => [a.user_id, a]) || []);
    const upsertRows: any[] = [];

    // 5. Determine status for expected users or users who submitted notice
    for (const user of users) {
      const att = attMap.get(user.id);
      const isExpected = isUserExpected(meeting.type, user.domain);
      const hasNotice = att?.pre_meeting_notice_status === "not_attending";

      if (isExpected || hasNotice) {
        if (att) {
          // If already marked present or excused explicitly, do not overwrite
          if (att.status === "present" || att.status === "excused") {
            continue;
          }

          // If member stated pre-meeting notice "not_attending", they become excused
          if (hasNotice) {
            upsertRows.push({
              id: att.id,
              meeting_id: meetingId,
              user_id: user.id,
              status: "excused",
              source: "auto"
            });
          } 
          // If they scanned in via QR code (i.e. scanned_at is set), mark them present
          else if (att.scanned_at) {
            upsertRows.push({
              id: att.id,
              meeting_id: meetingId,
              user_id: user.id,
              status: "present",
              source: "qr"
            });
          } 
          // Otherwise they are absent
          else {
            upsertRows.push({
              id: att.id,
              meeting_id: meetingId,
              user_id: user.id,
              status: "absent",
              source: "auto"
            });
          }
        } else {
          // No attendance row exists at all -> absent
          upsertRows.push({
            meeting_id: meetingId,
            user_id: user.id,
            status: "absent",
            source: "auto"
          });
        }
      }
    }

    // 6. Perform bulk upsert
    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("attendance")
        .upsert(upsertRows, { onConflict: "meeting_id,user_id" });

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Upload MOM document and update meetings.mom_url
 */
export async function uploadMomDocument(
  meetingId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const filePath = `${meetingId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("mom-documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from("mom-documents").getPublicUrl(filePath);

  // Update meeting mom_url in database
  const { error: dbError } = await supabase
    .from("meetings")
    .update({ mom_url: data.publicUrl })
    .eq("id", meetingId);

  if (dbError) return { url: null, error: dbError.message };

  return { url: data.publicUrl, error: null };
}

export type RosterMember = {
  user_id: string;
  full_name: string;
  email: string;
  domain: string | null;
  position_title: string;
  status: "present" | "absent" | "excused";
  pre_meeting_notice_status: "none" | "not_attending";
  pre_meeting_notice_reason: string | null;
};

/**
 * Retrieves the full roster for a meeting, merging user profiles with their attendance records.
 */
export async function getMeetingRoster(
  meetingId: string
): Promise<{ data: RosterMember[] | null; error: string | null }> {
  const supabase = createClient();

  try {
    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, email, domain, position_title")
      .order("full_name", { ascending: true });

    if (usersError) throw usersError;

    // 2. Fetch attendance rows for this meeting
    const { data: attendance, error: attError } = await supabase
      .from("attendance")
      .select("user_id, status, pre_meeting_notice_status, pre_meeting_notice_reason")
      .eq("meeting_id", meetingId);

    if (attError) throw attError;

    const attMap = new Map(attendance?.map((a) => [a.user_id, a]) || []);

    const roster: RosterMember[] = (users || []).map((u) => {
      const att = attMap.get(u.id);
      return {
        user_id: u.id,
        full_name: u.full_name,
        email: u.email,
        domain: u.domain,
        position_title: u.position_title,
        status: (att?.status || "absent") as "present" | "absent" | "excused",
        pre_meeting_notice_status: (att?.pre_meeting_notice_status || "none") as "none" | "not_attending",
        pre_meeting_notice_reason: att?.pre_meeting_notice_reason || null,
      };
    });

    return { data: roster, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}


