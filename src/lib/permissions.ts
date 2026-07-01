import { type User } from "@/types/database";
import { ROLES } from "./constants";

/**
 * Checks if a user profile has the Administrator role.
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === ROLES.ADMIN;
}

/**
 * Checks if a user profile has the standard Member role.
 */
export function isMember(user: User | null | undefined): boolean {
  return user?.role === ROLES.MEMBER;
}

/**
 * Defines permission check functions mapping actions to user authorization roles.
 */
export const PERMISSIONS = {
  createMeeting: (user: User | null | undefined) => isAdmin(user),
  editMeeting: (user: User | null | undefined) => isAdmin(user),
  deleteMeeting: (user: User | null | undefined) => isAdmin(user),
  viewAllAttendance: (user: User | null | undefined) => isAdmin(user),
  manageUsers: (user: User | null | undefined) => isAdmin(user),
  createEvent: (user: User | null | undefined) => isAdmin(user),
  manageVolunteers: (user: User | null | undefined) => isAdmin(user),
  markSelfAttendance: (user: User | null | undefined) => !!user,
  volunteerSelf: (user: User | null | undefined) => !!user,
} as const;

/**
 * Checks whether a user profile is authorized to perform a specific action.
 */
export function hasPermission(
  user: User | null | undefined,
  action: keyof typeof PERMISSIONS,
): boolean {
  return PERMISSIONS[action](user);
}
