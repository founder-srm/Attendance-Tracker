import { Meeting, Member } from "@/types/auth";

const MEETINGS_KEY = "attendance_meetings";
const MEMBERS_KEY = "attendance_members";
const ATTENDANCE_KEY = "attendance_records";
// ---------- Meetings ----------

export function getMeetings(): Meeting[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(MEETINGS_KEY);

  if (!data) return [];

  return JSON.parse(data).map((meeting: any) => ({
    ...meeting,
    date: new Date(meeting.date),
    createdAt: new Date(meeting.createdAt),
    updatedAt: new Date(meeting.updatedAt),
  }));
}

export function createMeeting(
  meeting: Omit<Meeting, "id" | "createdAt" | "updatedAt">
): Meeting {
  const meetings = getMeetings();

  const newMeeting: Meeting = {
    ...meeting,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  meetings.push(newMeeting);

  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));

  return newMeeting;
}

export function updateMeeting(
  id: string,
  updatedFields: Partial<Meeting>
): Meeting | null {
  const meetings = getMeetings();

  const index = meetings.findIndex((m) => m.id === id);

  if (index === -1) return null;

  meetings[index] = {
    ...meetings[index],
    ...updatedFields,
    updatedAt: new Date(),
  };

  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));

  return meetings[index];
}

export function deleteMeeting(id: string) {
  const meetings = getMeetings().filter((m) => m.id !== id);

  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
}

// ---------- Members ----------

export function getMembers(): Member[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(MEMBERS_KEY);

  if (!data) return [];

  return JSON.parse(data).map((member: any) => ({
    ...member,
    joinedAt: new Date(member.joinedAt),
  }));
}

export function createMember(
  member: Omit<Member, "id" | "joinedAt">
): Member {
  const members = getMembers();

  const newMember: Member = {
    ...member,
    id: crypto.randomUUID(),
    joinedAt: new Date(),
  };

  members.push(newMember);

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));

  return newMember;
}

export function updateMember(
  id: string,
  updatedFields: Partial<Member>
): Member | null {
  const members = getMembers();

  const index = members.findIndex((m) => m.id === id);

  if (index === -1) return null;

  members[index] = {
    ...members[index],
    ...updatedFields,
  };

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));

  return members[index];
}

export function deleteMember(id: string) {
  const members = getMembers().filter((m) => m.id !== id);

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}
// ---------- Attendance ----------

export function getAttendance() {
  if (typeof window === "undefined") return {};

  const data = localStorage.getItem(ATTENDANCE_KEY);

  return data ? JSON.parse(data) : {};
}

export function saveAttendance(
  meetingId: string,
  attendance: Record<string, boolean>
) {
  const allAttendance = getAttendance();

  allAttendance[meetingId] = attendance;

  localStorage.setItem(
    ATTENDANCE_KEY,
    JSON.stringify(allAttendance)
  );
}

export function getAttendanceForMeeting(meetingId: string) {
  const allAttendance = getAttendance();

  return allAttendance[meetingId] || {};
}