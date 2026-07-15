import { createClient } from "@/lib/supabase/client";

export type EventShiftStatus = 'invited' | 'requested' | 'confirmed' | 'declined' | 'present' | 'absent';

export interface ClubEvent {
  id: string;
  name: string | null;
  event_name: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface EventVenue {
  id: string;
  event_id: string;
  name: string;
}

export interface EventShift {
  id: string;
  event_id: string;
  venue_id: string | null;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: EventShiftStatus;
  decline_reason: string | null;
  users?: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string;
  } | null;
  event_venues?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Fetch all events, sorted chronologically by start date descending
 */
export async function getEvents(): Promise<{ data: ClubEvent[] | null; error: string | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) throw error;
    return { data: data as ClubEvent[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Creates an event and its venues in separate queries
 */
export async function createEvent(
  name: string,
  startDate: string,
  endDate: string,
  venues: string[]
): Promise<{ data: ClubEvent | null; error: string | null }> {
  const supabase = createClient();
  try {
    // 1. Insert event
    const { data: newEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        name,
        event_name: name, // back-compat
        start_date: startDate,
        end_date: endDate,
        event_date: startDate // back-compat
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // 2. Insert venues if any
    if (venues.length > 0) {
      const venueRows = venues.map((v) => ({
        event_id: newEvent.id,
        name: v.trim()
      }));

      const { error: venueError } = await supabase
        .from("event_venues")
        .insert(venueRows);

      if (venueError) throw venueError;
    }

    return { data: newEvent as ClubEvent, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Updates an event and syncs its venues (deletes and re-inserts)
 */
export async function updateEvent(
  eventId: string,
  name: string,
  startDate: string,
  endDate: string,
  venues: string[]
): Promise<{ data: ClubEvent | null; error: string | null }> {
  const supabase = createClient();
  try {
    // 1. Update event details
    const { data: updated, error: eventError } = await supabase
      .from("events")
      .update({
        name,
        event_name: name,
        start_date: startDate,
        end_date: endDate,
        event_date: startDate
      })
      .eq("id", eventId)
      .select()
      .single();

    if (eventError) throw eventError;

    // 2. Delete existing venues
    const { error: deleteError } = await supabase
      .from("event_venues")
      .delete()
      .eq("event_id", eventId);

    if (deleteError) throw deleteError;

    // 3. Insert new venues
    if (venues.length > 0) {
      const venueRows = venues.map((v) => ({
        event_id: eventId,
        name: v.trim()
      }));

      const { error: venueError } = await supabase
        .from("event_venues")
        .insert(venueRows);

      if (venueError) throw venueError;
    }

    return { data: updated as ClubEvent, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Deletes an event from the database
 */
export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

/**
 * Fetch all venues for an event
 */
export async function getEventVenues(eventId: string): Promise<{ data: EventVenue[] | null; error: string | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("event_venues")
      .select("*")
      .eq("event_id", eventId)
      .order("name", { ascending: true });

    if (error) throw error;
    return { data: data as EventVenue[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Fetch all shifts for an event, joining user and venue info
 */
export async function getEventShifts(eventId: string): Promise<{ data: EventShift[] | null; error: string | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("event_shifts")
      .select(`
        id,
        event_id,
        venue_id,
        user_id,
        shift_date,
        start_time,
        end_time,
        status,
        decline_reason,
        users (
          id,
          full_name,
          phone,
          email
        ),
        event_venues (
          id,
          name
        )
      `)
      .eq("event_id", eventId);

    if (error) throw error;
    return { data: data as unknown as EventShift[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Update the status of a specific shift
 */
export async function updateShiftStatus(
  shiftId: string,
  status: EventShiftStatus,
  declineReason?: string | null
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("event_shifts")
      .update({
        status,
        decline_reason: declineReason || null
      })
      .eq("id", shiftId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Add / assign a member to a shift
 */
export async function assignMemberToShift(
  eventId: string,
  venueId: string | null,
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  status: EventShiftStatus
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("event_shifts")
      .upsert(
        {
          event_id: eventId,
          venue_id: venueId,
          user_id: userId,
          shift_date: date,
          start_time: startTime,
          end_time: endTime,
          status
        },
        { onConflict: "event_id,user_id,shift_date,start_time" }
      );

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Fetch member RSVP'd and invited events
 */
export async function getMemberEvents(userId: string): Promise<{ data: ClubEvent[] | null; error: string | null }> {
  const supabase = createClient();
  try {
    // Select events where user has an associated shift
    const { data: shifts, error: shiftsError } = await supabase
      .from("event_shifts")
      .select("event_id")
      .eq("user_id", userId);

    if (shiftsError) throw shiftsError;

    const eventIds = Array.from(new Set(shifts?.map((s) => s.event_id) || []));
    if (eventIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .order("start_date", { ascending: false });

    if (eventsError) throw eventsError;
    return { data: events as ClubEvent[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || String(err) };
  }
}

/**
 * Handle user RSVP submission
 */
export async function submitMemberRSVP(
  eventId: string,
  userId: string,
  isVolunteering: boolean,
  shifts: { date: string; start_time: string; end_time: string }[],
  declineReason?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  try {
    // 1. Delete existing shifts for this user/event to recreate/overwrite
    const { error: deleteError } = await supabase
      .from("event_shifts")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    if (isVolunteering) {
      if (shifts.length === 0) {
        throw new Error("Must select at least one shift date/time.");
      }

      const shiftRows = shifts.map((s) => ({
        event_id: eventId,
        user_id: userId,
        shift_date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: "requested" as EventShiftStatus
      }));

      const { error: insertError } = await supabase
        .from("event_shifts")
        .insert(shiftRows);

      if (insertError) throw insertError;
    } else {
      // Decline: insert a declined indicator row
      const { error: declineError } = await supabase
        .from("event_shifts")
        .insert({
          event_id: eventId,
          user_id: userId,
          shift_date: new Date().toISOString().split("T")[0], // placeholder date
          start_time: "00:00:00",
          end_time: "00:00:00",
          status: "declined" as EventShiftStatus,
          decline_reason: declineReason || "No reason specified"
        });

      if (declineError) throw declineError;
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
