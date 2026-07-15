"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventVenues,
  getEventShifts,
  assignMemberToShift,
  updateShiftStatus,
  ClubEvent,
  EventVenue,
  EventShift,
  EventShiftStatus
} from "@/services/events";
import { getUsers, AppUser } from "@/services/members";
import { getDomainColorClass } from "@/lib/domainColors";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Check,
  X,
  Clock,
  Inbox,
  Grid,
  Settings,
  ChevronRight,
  UserPlus,
  ArrowLeft,
  Loader2
} from "lucide-react";

export default function ManageEventsPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view states
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venues, setVenues] = useState<string[]>([""]);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Management panel states
  const [activeTab, setActiveTab] = useState<"grid" | "requests" | "edit">("grid");
  const [eventVenuesList, setEventVenuesList] = useState<EventVenue[]>([]);
  const [eventShiftsList, setEventShiftsList] = useState<EventShift[]>([]);
  const [activeVenueId, setActiveVenueId] = useState<string>("");
  const [shiftsLoading, setShiftsLoading] = useState(false);

  // Member search states
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchEventsList();
    fetchUsersList();
  }, []);

  const fetchEventsList = async () => {
    setLoading(true);
    const { data, error } = await getEvents();
    if (error) setError(error);
    else setEvents(data || []);
    setLoading(false);
  };

  const fetchUsersList = async () => {
    const { data } = await getUsers();
    if (data) setAllUsers(data);
  };

  const handleSelectEvent = async (event: ClubEvent) => {
    setSelectedEvent(event);
    setActiveTab("grid");
    setShiftsLoading(true);
    await loadEventDetails(event.id);
    setShiftsLoading(false);
  };

  const loadEventDetails = async (eventId: string) => {
    const { data: vData } = await getEventVenues(eventId);
    const { data: sData } = await getEventShifts(eventId);

    const venuesList = vData || [];
    setEventVenuesList(venuesList);
    setEventShiftsList(sData || []);

    if (venuesList.length > 0) {
      setActiveVenueId(venuesList[0].id);
    } else {
      setActiveVenueId("");
    }
  };

  // Create event submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    setSubmittingForm(true);
    const filteredVenues = venues.filter((v) => v.trim() !== "");
    const { data, error } = await createEvent(name, startDate, endDate, filteredVenues);

    if (error) {
      alert("Error creating event: " + error);
    } else {
      setName("");
      setStartDate("");
      setEndDate("");
      setVenues([""]);
      setShowCreateForm(false);
      fetchEventsList();
      if (data) handleSelectEvent(data);
    }
    setSubmittingForm(false);
  };

  const handleAddVenueInput = () => {
    setVenues([...venues, ""]);
  };

  const handleRemoveVenueInput = (idx: number) => {
    if (venues.length <= 1) return;
    setVenues(venues.filter((_, i) => i !== idx));
  };

  const handleVenueInputChange = (idx: number, val: string) => {
    const next = [...venues];
    next[idx] = val;
    setVenues(next);
  };

  // Date calculation helpers
  const getDaysArray = (start: string, end: string) => {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      arr.push(new Date(dt).toISOString().split("T")[0]);
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };

  const eventDays = useMemo(() => {
    if (!selectedEvent?.start_date || !selectedEvent?.end_date) return [];
    return getDaysArray(selectedEvent.start_date, selectedEvent.end_date);
  }, [selectedEvent]);

  // Excel grid data format
  // Maps member rows assigned to the current active venue
  const gridMembers = useMemo(() => {
    if (!activeVenueId || !eventShiftsList) return [];

    // Group shifts by user_id
    const userShiftsMap = new Map<string, EventShift[]>();
    eventShiftsList.forEach((shift) => {
      if (shift.venue_id === activeVenueId) {
        const list = userShiftsMap.get(shift.user_id) || [];
        list.push(shift);
        userShiftsMap.set(shift.user_id, list);
      }
    });

    const rows: {
      userId: string;
      fullName: string;
      phone: string;
      email: string;
      domain: string | null;
      position: string;
      shifts: Map<string, EventShift>; // keyed by date
    }[] = [];

    userShiftsMap.forEach((shifts, userId) => {
      const firstShift = shifts[0];
      const user = firstShift.users;
      if (!user) return;

      const fullUserProfile = allUsers.find((u) => u.id === userId);

      const shiftMap = new Map<string, EventShift>();
      shifts.forEach((s) => {
        shiftMap.set(s.shift_date, s);
      });

      rows.push({
        userId,
        fullName: user.full_name,
        phone: user.phone || "—",
        email: user.email,
        domain: fullUserProfile?.domain || null,
        position: fullUserProfile?.position_title || "member",
        shifts: shiftMap
      });
    });

    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [activeVenueId, eventShiftsList, allUsers]);

  // Search autocomplete for members to add
  const filteredUsersToAssign = useMemo(() => {
    if (!searchMemberQuery.trim()) return [];
    const query = searchMemberQuery.toLowerCase();
    
    // Filter out users already assigned to this venue
    const currentVenueUserIds = new Set(gridMembers.map((m) => m.userId));

    return allUsers
      .filter((u) => !currentVenueUserIds.has(u.id))
      .filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [searchMemberQuery, allUsers, gridMembers]);

  // Add member to active venue
  const handleAddMemberToVenue = async (user: AppUser) => {
    if (!selectedEvent || !activeVenueId) return;

    // Create a shift for each day of the event
    const start = new Date(selectedEvent.start_date!);
    const end = new Date(selectedEvent.end_date!);
    const dt = new Date(start);

    setShiftsLoading(true);
    while (dt <= end) {
      const dateStr = dt.toISOString().split("T")[0];
      await assignMemberToShift(
        selectedEvent.id,
        activeVenueId,
        user.id,
        dateStr,
        "09:00:00",
        "17:00:00",
        "invited"
      );
      dt.setDate(dt.getDate() + 1);
    }

    await loadEventDetails(selectedEvent.id);
    setSearchMemberQuery("");
    setShiftsLoading(false);
  };

  // Change shift status inline inside grid cell
  const handleCellStatusChange = async (
    userId: string,
    date: string,
    existingShift: EventShift | undefined,
    status: EventShiftStatus
  ) => {
    if (!selectedEvent || !activeVenueId) return;

    setShiftsLoading(true);
    if (existingShift) {
      await updateShiftStatus(existingShift.id, status);
    } else {
      // Create record
      await assignMemberToShift(
        selectedEvent.id,
        activeVenueId,
        userId,
        date,
        "09:00:00",
        "17:00:00",
        status
      );
    }
    await loadEventDetails(selectedEvent.id);
    setShiftsLoading(false);
  };

  // Volunteer Requests Inbox list
  const volunteerRequests = useMemo(() => {
    return eventShiftsList.filter((s) => s.status === "requested");
  }, [eventShiftsList]);

  // Approve a request from member and mark present/confirmed
  const handleApproveRequest = async (shift: EventShift, approveAndMarkPresent: boolean) => {
    setShiftsLoading(true);
    
    // Determine target venue - if not set, fallback to the first venue in the list
    const venueId = shift.venue_id || (eventVenuesList.length > 0 ? eventVenuesList[0].id : null);
    
    if (venueId) {
      // Update shift with selected status and verify venue assignment
      await assignMemberToShift(
        shift.event_id,
        venueId,
        shift.user_id,
        shift.shift_date,
        shift.start_time,
        shift.end_time,
        approveAndMarkPresent ? "present" : "confirmed"
      );
    } else {
      alert("Please add at least one venue to this event first.");
    }

    await loadEventDetails(shift.event_id);
    setShiftsLoading(false);
  };

  // Delete event handler
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This action is irreversible.")) return;

    const { error } = await deleteEvent(eventId);
    if (error) {
      alert("Error deleting event: " + error);
    } else {
      setSelectedEvent(null);
      fetchEventsList();
    }
  };

  // Calculate dynamic days diff
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
    return isNaN(days) || days < 0 ? 0 : days;
  }, [startDate, endDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
            {selectedEvent ? (
              <>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-500"
                >
                  <ArrowLeft size={20} />
                </button>
                <span>{selectedEvent.name}</span>
              </>
            ) : (
              "Events & Volunteer Management"
            )}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedEvent
              ? "Coordinate rosters, check requests, and manage volunteer assignments."
              : "Create multi-day club events and configure shifts."}
          </p>
        </div>

        {!selectedEvent && !showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="rounded-xl bg-[#14213D] hover:bg-[#1f3357]"
          >
            <Plus size={16} className="mr-1.5" /> Create Event
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {!selectedEvent && !showCreateForm ? (
        // Event List Cards
        loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-zinc-50 border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center shadow-sm">
            <Calendar className="mx-auto text-zinc-400 mb-3" size={40} />
            <h4 className="font-semibold text-zinc-800">No events scheduled</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Schedule your first volunteer event to assign members and track rosters.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const start = event.start_date ? new Date(event.start_date) : null;
              const end = event.end_date ? new Date(event.end_date) : null;
              const days = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1 : 0;

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 hover:border-zinc-300 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-zinc-950 group-hover:text-[#14213D] transition">
                        {event.name}
                      </h4>
                      <ChevronRight size={18} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar size={14} />
                        <span>
                          {start ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                          {" – "}
                          {end ? end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </div>
                      <div className="inline-block bg-[#14213D]/5 text-[#14213D] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {days} {days === 1 ? "Day" : "Days"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-[11px] text-zinc-400">
                      Created {new Date(event.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : showCreateForm ? (
        // Create Event Form
        <div className="bg-white border rounded-xl shadow-sm max-w-2xl mx-auto overflow-hidden">
          <div className="bg-zinc-50 border-b p-5">
            <h4 className="font-bold text-zinc-950">Create New Event</h4>
            <p className="text-xs text-zinc-500">Define venues and shift schedules.</p>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Event Name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Annual Tech Symposium 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Start Date *</label>
                <Input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">End Date *</label>
                <Input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              Calculated Length: <strong className="text-zinc-800">{calculatedDays} {calculatedDays === 1 ? "day" : "days"}</strong>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1.5">
                <label className="text-xs font-semibold text-zinc-700">Venues</label>
                <button
                  type="button"
                  onClick={handleAddVenueInput}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Venue
                </button>
              </div>

              <div className="space-y-2">
                {venues.map((venue, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <MapPin size={16} className="text-zinc-400" />
                    <Input
                      value={venue}
                      onChange={(e) => handleVenueInputChange(idx, e.target.value)}
                      placeholder={`e.g. Auditorium ${idx + 1}`}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      disabled={venues.length <= 1}
                      onClick={() => handleRemoveVenueInput(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingForm}
                className="rounded-xl bg-[#14213D] hover:bg-[#1f3357]"
              >
                {submittingForm ? "Creating..." : "Save Event"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        // Event Management Dashboard (Selected Event)
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-200">
            <button
              onClick={() => setActiveTab("grid")}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition ${
                activeTab === "grid"
                  ? "border-[#14213D] text-[#14213D]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              } flex items-center gap-1.5`}
            >
              <Grid size={16} /> Active Roster Grid
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition ${
                activeTab === "requests"
                  ? "border-[#14213D] text-[#14213D]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              } flex items-center gap-1.5`}
            >
              <Inbox size={16} /> Volunteer Requests
              {volunteerRequests.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                  {volunteerRequests.length}
                </span>
              )}
            </button>
          </div>

          {shiftsLoading && (
            <div className="fixed top-6 right-6 bg-zinc-900 text-white font-medium text-xs px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Saving changes...
            </div>
          )}

          {activeTab === "grid" && (
            <div className="space-y-6">
              {/* Venue Sub-Tabs */}
              {eventVenuesList.length === 0 ? (
                <div className="p-8 border border-dashed rounded-xl bg-zinc-50 text-center">
                  <p className="text-zinc-500 text-sm">No venues defined. Add a venue in Edit settings.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {eventVenuesList.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => setActiveVenueId(venue.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                          activeVenueId === venue.id
                            ? "bg-[#14213D] text-white border-[#14213D]"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {venue.name}
                      </button>
                    ))}
                  </div>

                  {/* Add Member Box */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3 max-w-md relative">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                      <UserPlus size={14} /> Add Member to Venue Roster
                    </label>
                    <Input
                      placeholder="Type name or email to search..."
                      value={searchMemberQuery}
                      onChange={(e) => setSearchMemberQuery(e.target.value)}
                    />

                    {/* Autocomplete box */}
                    {filteredUsersToAssign.length > 0 && (
                      <div className="absolute left-5 right-5 mt-1 bg-white border rounded-lg shadow-lg z-30 divide-y overflow-hidden">
                        {filteredUsersToAssign.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleAddMemberToVenue(user)}
                            className="p-3 hover:bg-zinc-50 transition cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-zinc-900">{user.full_name}</p>
                              <p className="text-[10px] text-zinc-400">{user.email}</p>
                            </div>
                            <span className="text-[10px] font-medium text-emerald-600">Assign</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Excel Roster Grid */}
                  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <h4 className="font-bold text-zinc-950 text-sm">
                        Roster Grid &mdash; {eventVenuesList.find((v) => v.id === activeVenueId)?.name}
                      </h4>
                      <span className="text-xs text-zinc-400">
                        {gridMembers.length} volunteers assigned
                      </span>
                    </div>

                    {gridMembers.length === 0 ? (
                      <div className="p-12 text-center text-sm text-zinc-400 italic">
                        No members added to this venue yet. Use the search bar above to add some.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                              <th className="px-6 py-3.5 text-xs font-semibold text-zinc-500 min-w-[200px]">Volunteer</th>
                              <th className="px-6 py-3.5 text-xs font-semibold text-zinc-500">Phone</th>
                              {eventDays.map((day) => (
                                <th key={day} className="px-6 py-3.5 text-xs font-semibold text-zinc-500 min-w-[150px]">
                                  {new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {gridMembers.map((row) => (
                              <tr key={row.userId} className="hover:bg-zinc-50/50 transition">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <RoleBadge position={row.position as any} />
                                    <div>
                                      <p className="text-xs font-bold text-zinc-900">{row.fullName}</p>
                                      {row.domain && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getDomainColorClass(row.domain as any)}`}>
                                          {row.domain}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                                  {row.phone}
                                </td>
                                {eventDays.map((day) => {
                                  const shift = row.shifts.get(day);
                                  const status = shift?.status || "invited";

                                  return (
                                    <td key={day} className="px-6 py-4">
                                      <select
                                        value={status}
                                        onChange={(e) => handleCellStatusChange(row.userId, day, shift, e.target.value as EventShiftStatus)}
                                        className={`text-xs font-medium px-2.5 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-zinc-900 ${
                                          status === "present"
                                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                            : status === "absent"
                                            ? "text-red-700 bg-red-50 border-red-200"
                                            : status === "confirmed"
                                            ? "text-blue-700 bg-blue-50 border-blue-200"
                                            : status === "requested"
                                            ? "text-amber-700 bg-amber-50 border-amber-200"
                                            : status === "declined"
                                            ? "text-zinc-500 bg-zinc-100 border-zinc-300"
                                            : "text-zinc-400 bg-zinc-50 border-zinc-200"
                                        }`}
                                      >
                                        <option value="invited">Invited</option>
                                        <option value="requested">Requested</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="declined">Declined</option>
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                      </select>
                                      {shift?.decline_reason && status === "declined" && (
                                        <p className="text-[10px] text-red-500 mt-1 max-w-[130px] truncate" title={shift.decline_reason}>
                                          Rsn: {shift.decline_reason}
                                        </p>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-4 max-w-4xl">
              <div className="bg-zinc-50 border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm">Volunteer Shifts Requests</h4>
                  <p className="text-xs text-zinc-500">Approve pending applications from members.</p>
                </div>
                <span className="bg-[#14213D] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {volunteerRequests.length} Pending
                </span>
              </div>

              {volunteerRequests.length === 0 ? (
                <div className="p-12 border border-dashed rounded-xl bg-white text-center shadow-sm">
                  <Inbox className="mx-auto text-zinc-300 mb-3" size={32} />
                  <p className="text-zinc-500 text-sm italic">All requested shift applications have been cleared!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {volunteerRequests.map((shift) => (
                    <div
                      key={shift.id}
                      className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-950">{shift.users?.full_name}</p>
                          <span className="text-[10px] text-zinc-400">({shift.users?.email})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-zinc-400" />
                            <span>{new Date(shift.shift_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-zinc-400" />
                            <span>{shift.start_time.substring(0, 5)} &ndash; {shift.end_time.substring(0, 5)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(shift, false)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition"
                        >
                          Confirm RSVP
                        </button>
                        <button
                          onClick={() => handleApproveRequest(shift, true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition"
                        >
                          <Check size={14} /> Approve & Mark Present
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}