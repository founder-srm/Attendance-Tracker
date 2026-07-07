import { type UserRole } from "@/types/database";

export const ROLES = {
  ADMIN: "admin" as UserRole,
  MEMBER: "member" as UserRole,
} as const;
