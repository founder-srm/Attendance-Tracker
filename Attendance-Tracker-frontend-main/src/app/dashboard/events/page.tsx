"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  getEvents,
  getEventVenues,
  getEventShifts,
  submitMemberRSVP,
  ClubEvent,
  EventVenue,
  EventShift,
  EventShiftStatus
} from "@/services/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  Trash2,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
  FileText
} from "lucide-react";

interface SelectedShiftInput {
  date: string;
  startTime: string;
  endTime: string;
}

export default function MemberEventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel / RSVP state
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [venues, setVenues] = useState<EventVenue[]>([]);
  const [myShifts, setMyShifts] = useState<EventShift[]>([]);
  const [rsvpOption, setRsvpOption] = useState<"yes" | "no" | null>(null);

  // RSVP Form state
  const [selectedShifts, setSelectedShifts] = useState<SelectedShiftInput[]>([
    { date: "", startTime: "09:00", endTime: "17:00" }
  ]);
  const [declineReason, setDeclineReason] = useState("");
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchEventsData();
  }, [profile?.id]);

  const fetchEventsData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all events
      const { data: allEvents, error: eventsError } = await getEvents();
      if (eventsError) throw eventsError;

      // 2. Fetch all shifts for this user
      const { data: userShifts, error: shiftsError } = await supabase
        .from("event_shifts")
        .select("event_id")
        .eq("user_id", profile.id);

      if (shiftsError) throw shiftsError;

      const userEventIds = new Set(userShifts?.map((s) => s.event_id) || []);

      // Filter events where user has a shift record (invited/requested/confirmed/etc.)
      const myEvents = (allEvents || []).filter((e) => userEventIds.has(e.id));
      setEvents(myEvents);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (event: ClubEvent) => {
    setSelectedEvent(event);
    setSuccessMessage(null);
    if (!profile?.id) return;

    try {
      // Fetch venues
      const { data: vData } = await getEventVenues(event.id);
      setVenues(vData || []);

      // Fetch user's shifts for this event
      const { data: sData, error: sError } = await supabase
        .from("event_shifts")
        .select("*")
        .eq("event_id", event.id)
        .eq("user_id", profile.id);

      if (sError) throw sError;
      
      const shifts = (sData as EventShift[]) || [];
      setMyShifts(shifts);

      // Prepopulate RSVP inputs
      if (shifts.length > 0) {
        const isDeclined = shifts.some((s) => s.status === "declined");
        if (isDeclined) {
          setRsvpOption("no");
          setDeclineReason(shifts[0].decline_reason || "");
        } else {
          setRsvpOption("yes");
          const shiftInputs = shifts.map((s) => ({
            date: s.shift_date,
            startTime: s.start_time.substring(0, 5),
            endTime: s.end_time.substring(0, 5)
          }));
          setSelectedShifts(shiftInputs);
        }
      } else {
        setRsvpOption(null);
        setSelectedShifts([{ date: event.start_date || "", startTime: "09:00", endTime: "17:00" }]);
        setDeclineReason("");
      }
    } catch (err: any) {
      alert("Error loading event details: " + err.message);
    }
  };

  // Helper date lists for shift selector constraints
  const eventDatesList = useMemo(() => {
    if (!selectedEvent?.start_date || !selectedEvent?.end_date) return [];
    const arr = [];
    const dt = new Date(selectedEvent.start_date);
    const endDt = new Date(selectedEvent.end_date);
    while (dt <= endDt) {
      arr.push(dt.toISOString().split("T")[0]);
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  }, [selectedEvent]);

  // Form manipulation helpers
  const handleAddShiftRow = () => {
    setSelectedShifts([
      ...selectedShifts,
      { date: selectedEvent?.start_date || "", startTime: "09:00", endTime: "17:00" }
    ]);
  };

  const handleRemoveShiftRow = (idx: number) => {
    if (selectedShifts.length <= 1) return;
    setSelectedShifts(selectedShifts.filter((_, i) => i !== idx));
  };

  const handleShiftRowChange = (idx: number, field: keyof SelectedShiftInput, val: string) => {
    const next = [...selectedShifts];
    next[idx] = { ...next[idx], [field]: val };
    setSelectedShifts(next);
  };

  // Submit RSVP Form
  const handleSubmitRsvpForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedEvent) return;

    setSubmittingRsvp(true);
    setSuccessMessage(null);

    const isYes = rsvpOption === "yes";
    
    // Format times with seconds for Postgres TIME type compatibility (e.g. HH:MM:00)
    const formattedShifts = selectedShifts.map((s) => ({
      date: s.date,
      start_time: s.startTime.length === 5 ? `${s.startTime}:00` : s.startTime,
      end_time: s.endTime.length === 5 ? `${s.endTime}:00` : s.endTime
    }));

    const { success, error } = await submitMemberRSVP(
      selectedEvent.id,
      profile.id,
      isYes,
      formattedShifts,
      declineReason
    );

    if (error) {
      alert("Failed to submit RSVP: " + error);
    } else if (success) {
      setSuccessMessage("Your RSVP has been submitted successfully!");
      // Reload event detail info
      handleSelectEvent(selectedEvent);
      fetchEventsData();
    }
    setSubmittingRsvp(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
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
            "Events & Volunteering"
          )}
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          {selectedEvent
            ? "Register your availability and coordinate shifts."
            : "Review upcoming club events you are invited to volunteer for."}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Main content split */}
      {!selectedEvent ? (
        loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-zinc-50 border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <CalendarDays className="mx-auto text-zinc-300 mb-3" size={40} />
            <h4 className="font-semibold text-zinc-800">No event invitations</h4>
            <p className="text-xs text-zinc-500 mt-1">
              You haven&apos;t been invited to volunteer for any upcoming events yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const start = event.start_date ? new Date(event.start_date) : null;
              const end = event.end_date ? new Date(event.end_date) : null;
              const days = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1 : 0;

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow hover:border-zinc-300 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-zinc-950 group-hover:text-[#14213D] transition">
                      {event.name}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-zinc-400" />
                        <span>
                          {start?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" – "}
                          {end?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="inline-block bg-[#14213D]/5 text-[#14213D] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {days} {days === 1 ? "Day" : "Days"}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              );
            })}
          </div>
        )
      ) : (
        // Event Details & RSVP UI
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Details & venues */}
          <div className="space-y-6 md:col-span-1">
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-zinc-950 text-sm border-b pb-2">Event Schedule</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Duration</p>
                  <p className="text-xs text-zinc-800 font-medium">
                    {selectedEvent.start_date ? new Date(selectedEvent.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : ""}
                    {" to "}
                    {selectedEvent.end_date ? new Date(selectedEvent.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Venues</p>
                  {venues.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No venues defined</p>
                  ) : (
                    <div className="space-y-1 pt-0.5">
                      {venues.map((v) => (
                        <div key={v.id} className="flex items-center gap-1 text-xs text-zinc-600 font-medium">
                          <MapPin size={13} className="text-zinc-400" />
                          <span>{v.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shift Summary Badges */}
            {myShifts.length > 0 && (
              <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-zinc-950 text-sm border-b pb-2">My Roster Status</h4>
                <div className="space-y-2">
                  {myShifts.map((s) => {
                    const isDeclined = s.status === "declined";
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-zinc-100">
                        <span className="font-medium text-zinc-600">
                          {isDeclined ? "Decline Notice" : new Date(s.shift_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          s.status === "present"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : s.status === "confirmed"
                            ? "text-blue-700 bg-blue-50 border-blue-200"
                            : s.status === "requested"
                            ? "text-amber-700 bg-amber-50 border-amber-200"
                            : s.status === "declined"
                            ? "text-zinc-500 bg-zinc-50 border-zinc-200"
                            : "text-zinc-400 bg-zinc-50 border-zinc-200"
                        }`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: RSVP Selector Form */}
          <div className="md:col-span-2 space-y-6">
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
                {successMessage}
              </div>
            )}

            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h4 className="font-bold text-zinc-950 text-sm">Volunteer Registration Form</h4>
                <p className="text-xs text-zinc-500 mt-1">Submit your availability for event planning.</p>
              </div>

              <form onSubmit={handleSubmitRsvpForm} className="space-y-6">
                {/* RSVP Choice Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Are you volunteering for this event? *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setRsvpOption("yes")}
                      className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-2 ${
                        rsvpOption === "yes"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100"
                          : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <CheckCircle size={16} /> Yes, I want to volunteer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvpOption("no")}
                      className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-2 ${
                        rsvpOption === "no"
                          ? "bg-red-50 text-red-800 border-red-300 ring-2 ring-red-100"
                          : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <XCircle size={16} /> No, I cannot attend
                    </button>
                  </div>
                </div>

                {/* YES Option: Shift Selector */}
                {rsvpOption === "yes" && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <label className="text-xs font-bold text-zinc-800">Select Shifts Availability</label>
                      <button
                        type="button"
                        onClick={handleAddShiftRow}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Shift
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedShifts.map((shift, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200 relative">
                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] uppercase font-bold text-zinc-400">Date *</label>
                            <select
                              required
                              value={shift.date}
                              onChange={(e) => handleShiftRowChange(idx, "date", e.target.value)}
                              className="w-full h-10 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            >
                              <option value="">— Choose a date —</option>
                              {eventDatesList.map((d) => (
                                <option key={d} value={d}>
                                  {new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] uppercase font-bold text-zinc-400">Start Time *</label>
                            <Input
                              required
                              type="time"
                              value={shift.startTime}
                              onChange={(e) => handleShiftRowChange(idx, "startTime", e.target.value)}
                              className="h-10 text-xs"
                            />
                          </div>

                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] uppercase font-bold text-zinc-400">End Time *</label>
                            <Input
                              required
                              type="time"
                              value={shift.endTime}
                              onChange={(e) => handleShiftRowChange(idx, "endTime", e.target.value)}
                              className="h-10 text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={selectedShifts.length <= 1}
                            onClick={() => handleRemoveShiftRow(idx)}
                            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 transition sm:mt-5"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NO Option: Decline Reason */}
                {rsvpOption === "no" && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-zinc-700">Specify Reason *</label>
                    <textarea
                      required
                      placeholder="Please specify why you are unable to attend..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none animate-in fade-in"
                    />
                  </div>
                )}

                {/* Form Buttons */}
                {rsvpOption !== null && (
                  <div className="flex items-center justify-end gap-3 border-t pt-4">
                    <Button
                      type="submit"
                      disabled={submittingRsvp}
                      className="rounded-xl bg-[#14213D] hover:bg-[#1f3357] w-full sm:w-auto"
                    >
                      {submittingRsvp ? "Submitting..." : "Submit RSVP Availability"}
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}