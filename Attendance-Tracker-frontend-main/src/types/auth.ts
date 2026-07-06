export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  createdAt: Date;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  status: "present" | "absent" | "late";
  timestamp: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
