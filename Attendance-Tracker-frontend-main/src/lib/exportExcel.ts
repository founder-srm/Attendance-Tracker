import * as XLSX from "xlsx";
import { getMeetings, getMembers } from "./store";

export function exportToExcel() {
  const meetings = getMeetings();
  const members = getMembers();

  const meetingData = meetings.map((meeting) => ({
    Title: meeting.title,
    Description: meeting.description,
    Date: new Date(meeting.date).toLocaleDateString(),
    "Start Time": meeting.startTime,
    "End Time": meeting.endTime,
    Location: meeting.location,
    "Created By": meeting.createdBy,
  }));

  const memberData = members.map((member) => ({
    Name: member.name,
    Email: member.email,
    Joined: new Date(member.joinedAt).toLocaleDateString(),
  }));

  const workbook = XLSX.utils.book_new();

  const meetingSheet = XLSX.utils.json_to_sheet(meetingData);
  const memberSheet = XLSX.utils.json_to_sheet(memberData);

  XLSX.utils.book_append_sheet(workbook, meetingSheet, "Meetings");
  XLSX.utils.book_append_sheet(workbook, memberSheet, "Members");

  XLSX.writeFile(workbook, "Attendance_Data.xlsx");
}