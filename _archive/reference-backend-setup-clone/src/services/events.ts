import { createClient } from "@/lib/supabase/server";
import {
  type Event,
  type EventVolunteer,
  type User,
  type Database,
} from "@/types/database";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

/**
 * Creates a new event record.
 */
export async function createEvent(event: EventInsert): Promise<Event | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .insert(event)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Event;
  } catch (error) {
    console.error("Error in createEvent:", error);
    return null;
  }
}

/**
 * Retrieves all events sorted by date descending.
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Event[];
  } catch (error) {
    console.error("Error in getEvents:", error);
    return [];
  }
}

/**
 * Registers a user as a volunteer for a specific event.
 */
export async function registerVolunteer(
  eventId: string,
  userId: string,
): Promise<EventVolunteer | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_volunteers")
      .insert({
        event_id: eventId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as EventVolunteer;
  } catch (error) {
    console.error(
      `Error in registerVolunteer for event ${eventId}, user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * Retrieves the list of volunteers for an event, including their user profiles.
 */
export async function getVolunteers(
  eventId: string,
): Promise<(EventVolunteer & { user: User | null })[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_volunteers")
      .select("*, user:users(*)")
      .eq("event_id", eventId);

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      event_id: row.event_id,
      user_id: row.user_id,
      marked_at: row.marked_at,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
    })) as (EventVolunteer & { user: User | null })[];
  } catch (error) {
    console.error(`Error in getVolunteers for event ${eventId}:`, error);
    return [];
  }
}
