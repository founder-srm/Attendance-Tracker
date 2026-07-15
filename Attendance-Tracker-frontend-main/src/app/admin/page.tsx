"use client";

import { AdminDashboard } from "@/components/admin/AdminDashboard";

/**
 * Admin overview page.
 * Auth + role-based access is enforced by:
 *   1. AuthProvider (client-side role routing) — redirects non-admins to /dashboard
 *   2. admin/layout.tsx (renders the sidebar/header)
 * No fake token check needed here.
 */
export default function AdminPage() {
  return <AdminDashboard />;
}
