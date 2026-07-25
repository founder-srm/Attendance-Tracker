"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  CalendarDays,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MeetingType = "Club" | "Technical" | "Creatives" | "Outreach" | "Event" | "Other";
type TypePill = "All" | "Club" | "Technical" | "Creatives" | "Outreach";

interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string | null; // YYYY-MM-DD
  start_time: string | null;
}

interface AttendanceRow {
  member_name: string;
  member_email: string;
  meeting_title: string;
  meeting_type: string;
  domain: string;
  date: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_TYPES: MeetingType[] = ["Technical", "Creatives", "Outreach"];

const TYPE_PILLS: { label: string; value: TypePill }[] = [
  { label: "All", value: "All" },
  { label: "Club Meet", value: "Club" },
  { label: "Technical", value: "Technical" },
  { label: "Creatives", value: "Creatives" },
  { label: "Outreach", value: "Outreach" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD without timezone shift */
function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function buildFilename(meeting: Meeting, ext: "csv" | "xlsx"): string {
  return `attendance_${slugify(meeting.title)}_${meeting.date ?? "unknown"}.${ext}`;
}

function capitalizeFirst(s: string): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function meetingTypeLabel(type: MeetingType): string {
  if (type === "Club") return "Club Meet";
  if (type === "Event") return "Event";
  if (DOMAIN_TYPES.includes(type)) return "Domain Meet";
  return type;
}

/** Check if a meeting matches the active type pill */
function matchesPill(meeting: Meeting, pill: TypePill): boolean {
  if (pill === "All") return true;
  return meeting.type === pill;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase: load all meetings once
// ─────────────────────────────────────────────────────────────────────────────

async function loadAllMeetings(): Promise<Meeting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, type, date, start_time")
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Meeting[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase: fetch attendance for a meeting
//
// The `attendance` table has TWO foreign keys to `users`:
//   • user_id   → users(id)   — the member who attended
//   • marked_by → users(id)   — the admin who marked it
//
// Without an explicit hint PostgREST throws:
//   "more than one relationship found for attendance and users"
//
// Fix: use column-name hint syntax  users!user_id(...)
//      and                          meetings!meeting_id(...)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAttendanceForMeeting(meetingId: string): Promise<AttendanceRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
      status,
      scanned_at,
      member:users!user_id ( full_name, email ),
      meeting:meetings!meeting_id ( id, title, type, date, start_time )
      `,
    )
    .eq("meeting_id", meetingId);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const rows = data as unknown as Array<{
    status: string;
    scanned_at: string;
    member: { full_name: string; email: string } | null;
    meeting: {
      id: string;
      title: string;
      type: string;
      date: string | null;
      start_time: string | null;
    } | null;
  }>;

  return rows.map((row) => {
    const mt = (row.meeting?.type ?? "Other") as MeetingType;
    const isDomain = DOMAIN_TYPES.includes(mt);
    const rawDate = row.meeting?.date ?? null;
    const displayDate = rawDate
      ? formatDisplayDate(rawDate)
      : row.scanned_at
        ? new Date(row.scanned_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

    return {
      member_name: row.member?.full_name ?? "Unknown",
      member_email: row.member?.email ?? "—",
      meeting_title: row.meeting?.title ?? "—",
      meeting_type: meetingTypeLabel(mt),
      domain: isDomain ? mt : "—",
      date: displayDate,
      status: capitalizeFirst(row.status),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  "Member Name",
  "Member Email",
  "Meeting Title",
  "Meeting Type",
  "Domain",
  "Date",
  "Status",
];

function rowToArr(r: AttendanceRow): string[] {
  return [r.member_name, r.member_email, r.meeting_title, r.meeting_type, r.domain, r.date, r.status];
}

function exportCSV(rows: AttendanceRow[], filename: string): void {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...rows.map((r) => rowToArr(r).map((v) => `"${v}"`).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel export (SheetJS)
// ─────────────────────────────────────────────────────────────────────────────

function exportExcel(rows: AttendanceRow[], filename: string): void {
  const wsData = [EXPORT_HEADERS, ...rows.map(rowToArr)];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Bold emerald header row
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: "059669" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { bottom: { style: "medium", color: { rgb: "047857" } } },
  };
  EXPORT_HEADERS.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = headerStyle;
  });

  // Alternating row fill
  for (let r = 1; r < wsData.length; r++) {
    const fill =
      r % 2 === 0
        ? { patternType: "solid", fgColor: { rgb: "F0FDF4" } }
        : { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    EXPORT_HEADERS.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].s = { fill, font: { sz: 10 }, alignment: { horizontal: "left" } };
    });
  }

  // Auto column widths
  ws["!cols"] = EXPORT_HEADERS.map((h, c) => ({
    wch: Math.min(
      Math.max(h.length, ...wsData.slice(1).map((row) => String(row[c] ?? "").length)) + 4,
      45,
    ),
  }));

  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Searchable Meeting Dropdown
// Fixed: search pinned at top, list scrollable, each item shows full context
// ─────────────────────────────────────────────────────────────────────────────

interface MeetingDropdownProps {
  /** Pre-filtered list to display (type + date already applied) */
  meetings: Meeting[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

function MeetingDropdown({ meetings, selectedId, onChange }: MeetingDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search within the already-filtered list
  const visible = useMemo(
    () =>
      meetings.filter(
        (m) =>
          query === "" ||
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          m.type.toLowerCase().includes(query.toLowerCase()) ||
          (m.date ?? "").includes(query),
      ),
    [meetings, query],
  );

  const selected = meetings.find((m) => m.id === selectedId) ?? null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleSelect = (m: Meeting) => {
    onChange(m.id);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  // Type badge colours
  const badgeClass = (type: MeetingType) => {
    if (type === "Club") return "bg-blue-100 text-blue-700";
    if (type === "Event") return "bg-purple-100 text-purple-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger ── */}
      <button
        id="meeting-dropdown-trigger"
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm text-left transition-all
          ${open ? "border-emerald-500 ring-2 ring-emerald-100 bg-white" : ""}
          ${!open && selected ? "border-zinc-300 bg-white" : ""}
          ${!open && !selected ? "border-zinc-200 bg-zinc-50" : ""}
        `}
      >
        {selected ? (
          <span className="font-medium text-zinc-900 truncate">
            {selected.title}
            {selected.date ? ` — ${formatDisplayDate(selected.date)}` : ""}
            {` — ${selected.type}`}
          </span>
        ) : (
          <span className="text-zinc-400">
            {meetings.length === 0 ? "No meetings match the selected filters" : "Select a meeting…"}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
              className="p-0.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-zinc-200 rounded-xl shadow-xl">

          {/* Search — fixed at top, does NOT scroll */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100 bg-white">
            <Search size={14} className="text-zinc-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, type, date…"
              className="flex-1 text-sm text-zinc-800 bg-transparent outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-zinc-300 hover:text-zinc-500">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Scrollable list — max-h-60 with scrollbar */}
          <ul className="max-h-60 overflow-y-auto divide-y divide-zinc-50">
            {visible.length === 0 ? (
              <li className="px-4 py-5 text-sm text-zinc-400 text-center">
                No meetings found{query ? ` for "${query}"` : ""}.
              </li>
            ) : (
              visible.map((m) => {
                const isSelected = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-50 ${
                        isSelected ? "bg-emerald-50" : ""
                      }`}
                    >
                      {/* Left: title + date subtitle */}
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <span
                          className={`font-medium truncate leading-tight ${
                            isSelected ? "text-emerald-700" : "text-zinc-900"
                          }`}
                        >
                          {m.title}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {m.date ? formatDisplayDate(m.date) : "No date"}
                          {m.start_time ? `  ·  ${m.start_time}` : ""}
                        </span>
                      </div>

                      {/* Right: type badge + check */}
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass(m.type)}`}>
                          {m.type}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-emerald-600" />}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Count footer */}
          {visible.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-50 bg-zinc-50">
              <p className="text-xs text-zinc-400">
                {visible.length} meeting{visible.length !== 1 ? "s" : ""}
                {query ? " match" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill toggle group
// ─────────────────────────────────────────────────────────────────────────────

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: TypePill }[];
  value: TypePill;
  onChange: (v: TypePill) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExportReportsPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsLoadError, setMeetingsLoadError] = useState<string | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [typePill, setTypePill] = useState<TypePill>("All");
  const [selectedDate, setSelectedDate] = useState<string>("");      // YYYY-MM-DD
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // ── Export state ──────────────────────────────────────────────────────────
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [emptyMsg, setEmptyMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load meetings once on mount ───────────────────────────────────────────
  useEffect(() => {
    setMeetingsLoading(true);
    loadAllMeetings()
      .then(setAllMeetings)
      .catch((e: Error) => setMeetingsLoadError(e.message ?? "Failed to load meetings."))
      .finally(() => setMeetingsLoading(false));
  }, []);

  // ── Derived: meetings that pass the TYPE filter ───────────────────────────
  const typeFilteredMeetings = useMemo(
    () => allMeetings.filter((m) => matchesPill(m, typePill)),
    [allMeetings, typePill],
  );

  // ── Derived: meetings shown in the dropdown (type + date) ─────────────────
  const dropdownMeetings = useMemo(() => {
    if (!selectedDate) return typeFilteredMeetings;
    return typeFilteredMeetings.filter((m) => m.date === selectedDate);
  }, [typeFilteredMeetings, selectedDate]);

  // ── Derived: valid dates for the date picker (only dates with meetings
  //    that pass the active type filter) ────────────────────────────────────
  const validDates = useMemo(() => {
    const dates = typeFilteredMeetings.map((m) => m.date).filter(Boolean) as string[];
    return [...new Set(dates)].sort();
  }, [typeFilteredMeetings]);

  // ── Selected meeting object ───────────────────────────────────────────────
  const selectedMeeting = allMeetings.find((m) => m.id === selectedMeetingId) ?? null;
  const isExporting = isExportingCSV || isExportingExcel;

  // ── Helper: clear status messages ─────────────────────────────────────────
  const clearMessages = () => {
    setExportError(null);
    setEmptyMsg(null);
    setSuccessMsg(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handler: type pill changes
  //   → re-filters the date list and meeting dropdown
  //   → if the selected date is no longer valid, clear it
  //   → if the selected meeting no longer matches, clear it
  // ─────────────────────────────────────────────────────────────────────────
  const handlePillChange = (pill: TypePill) => {
    setTypePill(pill);
    clearMessages();

    // Recompute valid dates for new pill
    const newFilteredMeetings = allMeetings.filter((m) => matchesPill(m, pill));
    const newValidDates = new Set(newFilteredMeetings.map((m) => m.date).filter(Boolean));

    if (selectedDate && !newValidDates.has(selectedDate)) {
      setSelectedDate("");
      setSelectedMeetingId(null);
    } else if (selectedMeetingId) {
      const meetingStillValid = newFilteredMeetings.some((m) => m.id === selectedMeetingId);
      if (!meetingStillValid) setSelectedMeetingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handler: date picker changes
  //   → narrows meeting dropdown to that date
  //   → if selected meeting isn't on that date, clear it
  // ─────────────────────────────────────────────────────────────────────────
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    clearMessages();

    if (selectedMeetingId && date) {
      const meetingStillValid = dropdownMeetings.some(
        (m) => m.id === selectedMeetingId && m.date === date,
      );
      if (!meetingStillValid) setSelectedMeetingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handler: meeting selected from dropdown
  //   → also auto-fills the date picker to that meeting's date
  // ─────────────────────────────────────────────────────────────────────────
  const handleMeetingChange = (id: string | null) => {
    setSelectedMeetingId(id);
    clearMessages();

    if (id) {
      const m = allMeetings.find((m) => m.id === id);
      if (m?.date) setSelectedDate(m.date); // auto-fill date
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────────────────────────────────
  const handleExport = async (format: "csv" | "xlsx") => {
    if (!selectedMeeting) return;
    clearMessages();

    if (format === "csv") setIsExportingCSV(true);
    else setIsExportingExcel(true);

    try {
      const rows = await fetchAttendanceForMeeting(selectedMeeting.id);

      if (rows.length === 0) {
        setEmptyMsg("No attendance records found for this meeting.");
        return;
      }

      const filename = buildFilename(selectedMeeting, format);
      if (format === "csv") exportCSV(rows, filename);
      else exportExcel(rows, filename);

      setSuccessMsg(
        `✓  ${rows.length} record${rows.length !== 1 ? "s" : ""} exported — "${filename}"`,
      );
    } catch (err: unknown) {
      console.error("Export error:", err);
      setExportError("Export failed. Please try again.");
    } finally {
      setIsExportingCSV(false);
      setIsExportingExcel(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950">Export Reports</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Filter by type, pick a date or meeting, then download attendance records.
        </p>
      </div>

      {/* Load error */}
      {meetingsLoadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0" />
          {meetingsLoadError}
        </div>
      )}

      {/* ── Main card ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">

        {/* ══ STEP 1: Filter by type ═══════════════════════════════════════ */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              1
            </span>
            <h4 className="text-sm font-semibold text-zinc-800">Filter by Type</h4>
            <span className="text-xs text-zinc-400">— narrows both date and meeting list</span>
          </div>

          <PillGroup options={TYPE_PILLS} value={typePill} onChange={handlePillChange} />

          {/* Live count */}
          <p className="text-xs text-zinc-400">
            {meetingsLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Loading…
              </span>
            ) : (
              <>
                <span className="font-semibold text-zinc-600">{typeFilteredMeetings.length}</span>{" "}
                meeting{typeFilteredMeetings.length !== 1 ? "s" : ""} match
                {typePill !== "All" ? ` "${typePill}"` : ""}.
              </>
            )}
          </p>
        </div>

        {/* ══ STEP 2: Date + Meeting (bidirectional) ════════════════════════ */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 text-[10px] font-bold">
              2
            </span>
            <h4 className="text-sm font-semibold text-zinc-800">Select Date &amp; Meeting</h4>
            <span className="text-xs text-zinc-400">— pick either one; the other updates automatically</span>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <label htmlFor="date-picker" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Date
            </label>
            <div className="relative">
              <CalendarDays
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                list="valid-meeting-dates"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate("");
                    clearMessages();
                    // If selected meeting is no longer valid without date, keep it (date is optional)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Datalist — only shows dates with meetings of the filtered type */}
            <datalist id="valid-meeting-dates">
              {validDates.map((d) => <option key={d} value={d} />)}
            </datalist>

            {/* Date context hint */}
            {selectedDate && (
              <p className="text-xs text-zinc-400">
                {dropdownMeetings.length === 0 ? (
                  <span className="text-amber-600 font-medium">
                    No {typePill !== "All" ? typePill + " " : ""}meetings on{" "}
                    {formatDisplayDate(selectedDate)}.
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-zinc-600">{dropdownMeetings.length}</span>{" "}
                    meeting{dropdownMeetings.length !== 1 ? "s" : ""} on{" "}
                    {formatDisplayDate(selectedDate)}.
                  </>
                )}
              </p>
            )}
          </div>

          {/* Meeting dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Meeting
            </label>

            {meetingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-3">
                <Loader2 size={14} className="animate-spin text-emerald-600" />
                Loading meetings…
              </div>
            ) : (
              <MeetingDropdown
                meetings={dropdownMeetings}
                selectedId={selectedMeetingId}
                onChange={handleMeetingChange}
              />
            )}

            {/* Selected meeting summary */}
            {selectedMeeting && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-1.5">
                <CheckCircle2 size={13} className="flex-shrink-0" />
                <span className="font-semibold truncate">{selectedMeeting.title}</span>
                {selectedMeeting.date && (
                  <span className="text-emerald-500 flex-shrink-0">
                    · {formatDisplayDate(selectedMeeting.date)}
                    {selectedMeeting.start_time ? `  ·  ${selectedMeeting.start_time}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ STEP 3: Export buttons — only after meeting is selected ═══════ */}
        {selectedMeeting && (
          <div className="p-6 bg-zinc-50 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 text-[10px] font-bold">
                3
              </span>
              <h4 className="text-sm font-semibold text-zinc-800">Export</h4>
            </div>

            <div className="flex gap-3">
              {/* CSV */}
              <button
                id="export-csv-btn"
                type="button"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExportingCSV
                  ? <Loader2 size={15} className="animate-spin text-emerald-600" />
                  : <FileText size={15} className="text-emerald-600" />}
                {isExportingCSV ? "Generating…" : "Export as CSV"}
              </button>

              {/* Excel */}
              <button
                id="export-excel-btn"
                type="button"
                onClick={() => handleExport("xlsx")}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExportingExcel
                  ? <Loader2 size={15} className="animate-spin" />
                  : <FileSpreadsheet size={15} />}
                {isExportingExcel ? "Generating…" : "Export as Excel (.xlsx)"}
              </button>
            </div>

            {/* Filename preview */}
            <p className="text-xs text-zinc-400 text-center">
              Files:{" "}
              <span className="font-mono">
                {`attendance_${slugify(selectedMeeting.title)}_${selectedMeeting.date ?? "unknown"}.[csv / xlsx]`}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Status messages ─────────────────────────────────────────────────── */}
      {emptyMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{emptyMsg}</p>
        </div>
      )}

      {exportError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">{exportError}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Download size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{successMsg}</p>
        </div>
      )}

      {/* ── How-to hint (only before meeting is selected) ─────────────────── */}
      {!selectedMeeting && !meetingsLoading && !meetingsLoadError && (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">How it works</p>
          <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
            <li>
              <span className="font-medium text-zinc-600">Filter by type</span> — narrows both the
              date list and meeting dropdown to Club, Technical, Creatives, or Outreach.
            </li>
            <li>
              <span className="font-medium text-zinc-600">Pick a date or a meeting</span> — either
              works. Selecting a date narrows the dropdown; selecting a meeting auto-fills the date.
            </li>
            <li>
              <span className="font-medium text-zinc-600">Export</span> — download as UTF-8 CSV or
              a formatted Excel file with bold headers and alternating rows.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}