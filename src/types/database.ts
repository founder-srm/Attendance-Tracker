export type UserRole = "admin" | "member";

export type MeetingType =
  | "Club"
  | "Technical"
  | "Creatives"
  | "Outreach"
  | "Event"
  | "Other";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string; // Auth UUID
          full_name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          type: MeetingType;
          time_limit_minutes: number;
          agenda: string | null;
          mom: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: MeetingType;
          time_limit_minutes: number;
          agenda?: string | null;
          mom?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: MeetingType;
          time_limit_minutes?: number;
          agenda?: string | null;
          mom?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          scanned_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          event_name: string;
          event_date: string; // DATE type in Postgres maps to string in JS (YYYY-MM-DD)
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          event_date: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          event_date?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      event_volunteers: {
        Row: {
          event_id: string;
          user_id: string;
          marked_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          marked_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          marked_at?: string;
        };
      };
    };
    Views: {
      member_attendance_stats: {
        Row: {
          user_id: string;
          total_meetings: number;
          attended_meetings: number;
          missed_meetings: number;
          attendance_percentage: number;
        };
      };
    };
  };
}

// Helper entity types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventVolunteer =
  Database["public"]["Tables"]["event_volunteers"]["Row"];
export type MemberAttendanceStats =
  Database["public"]["Views"]["member_attendance_stats"]["Row"];
