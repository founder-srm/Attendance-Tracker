import { createClient } from "@/lib/supabase/server";
import { type Meeting, type Database } from "@/types/database";

type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
type MeetingUpdate = Database["public"]["Tables"]["meetings"]["Update"];

/**
 * Creates a new meeting.
 */
export async function createMeeting(
  meeting: MeetingInsert,
): Promise<Meeting | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meetings")
      .insert(meeting)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Meeting;
  } catch (error) {
    console.error("Error in createMeeting:", error);
    return null;
  }
}

/**
 * Retrieves a single meeting by its ID.
 */
export async function getMeeting(id: string): Promise<Meeting | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data as Meeting;
  } catch (error) {
    console.error(`Error in getMeeting for ${id}:`, error);
    return null;
  }
}

/**
 * Retrieves all meetings in the system, sorted by creation date descending.
 */
export async function getMeetings(): Promise<Meeting[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Meeting[];
  } catch (error) {
    console.error("Error in getMeetings:", error);
    return [];
  }
}

/**
 * Updates an existing meeting record.
 */
export async function updateMeeting(
  id: string,
  updates: MeetingUpdate,
): Promise<Meeting | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meetings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Meeting;
  } catch (error) {
    console.error(`Error in updateMeeting for ${id}:`, error);
    return null;
  }
}

/**
 * Deletes a meeting from the system.
 */
export async function deleteMeeting(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("meetings").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error in deleteMeeting for ${id}:`, error);
    return false;
  }
}
