"use client";

import { useEffect, useState } from "react";
import { getUsers, updateUser, type AppUser, type MemberDomain, type MemberPosition } from "@/services/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/RoleBadge";
import { getDomainColorClass } from "@/lib/domainColors";

const DOMAINS: MemberDomain[] = ["technical", "creatives", "operations", "outreach", "sponsorship"];
const POSITIONS: MemberPosition[] = ["president", "vice_president", "hr", "lead", "associate_lead", "member"];

export function MemberManagement() {
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters state ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  // ── Inline-edit state ────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "member">("member");
  const [editDomain, setEditDomain] = useState<MemberDomain | "none">("none");
  const [editPosition, setEditPosition] = useState<MemberPosition>("member");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load members on mount ───────────────────────────────────────────────────
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getUsers();
    if (err) {
      setError("Could not load members: " + err);
    } else {
      setMembers(data ?? []);
    }
    setLoading(false);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const startEdit = (member: AppUser) => {
    setEditingId(member.id);
    setEditName(member.full_name);
    setEditRole(member.role);
    setEditDomain(member.domain || "none");
    setEditPosition(member.position_title || "member");
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const handleSave = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError(null);

    const updates = {
      full_name: editName.trim(),
      role: editRole,
      domain: editDomain === "none" ? null : editDomain,
      position_title: editPosition,
    };

    const { data, error: err } = await updateUser(id, updates);

    if (err) {
      setSaveError("Save failed: " + err);
    } else if (data) {
      setMembers((prev) => prev.map((m) => (m.id === id ? data : m)));
      setEditingId(null);
    }
    setSaving(false);
  };

  // ── Client-side Filter Logic ───────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const query = searchTerm.toLowerCase();
    
    // 1. Unified search across name, phone, email
    const matchesSearch =
      m.full_name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      (m.phone && m.phone.toLowerCase().includes(query));

    // 2. Domain match
    const matchesDomain = filterDomain === "all" || m.domain === filterDomain;

    // 3. Leadership/Role match
    const matchesRole =
      filterRole === "all" ||
      (filterRole === "leads" && m.position_title === "lead") ||
      (filterRole === "associate_leads" && m.position_title === "associate_lead") ||
      (filterRole === "executives" && ["president", "vice_president", "hr"].includes(m.position_title)) ||
      (filterRole === "members" && m.position_title === "member");

    return matchesSearch && matchesDomain && matchesRole;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How members are added</p>
        <p>
          Members self-register at{" "}
          <span className="font-mono bg-blue-100 px-1 rounded">/signup</span>.
          As admin, you can edit their display name, organizational position, and club domain here.
        </p>
      </div>

      {/* Search & Filter Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Search Name, Phone or Email
          </label>
          <Input
            placeholder="Type search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Domain Filter */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Filter by Domain
          </label>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          >
            <option value="all">All Domains</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Leadership Filter */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Filter by Position / Role
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          >
            <option value="all">All Positions</option>
            <option value="executives">Executives (P, VP, HR)</option>
            <option value="leads">Leads (L)</option>
            <option value="associate_leads">Associate Leads (AL)</option>
            <option value="members">Regular Members</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Auth Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Club Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#14213D]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-gray-400 text-sm"
                    >
                      No matching members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      {editingId === member.id ? (
                        <>
                          {/* Name input */}
                          <td className="px-6 py-3">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                            />
                          </td>
                          {/* Email read-only */}
                          <td className="px-6 py-3 text-gray-500 text-sm">
                            {member.email}
                          </td>
                          {/* Phone read-only (edit via profile page) */}
                          <td className="px-6 py-3 text-gray-500 text-sm">
                            {member.phone || "—"}
                          </td>
                          {/* Auth Role Select */}
                          <td className="px-6 py-3">
                            <select
                              value={editRole}
                              onChange={(e) =>
                                setEditRole(
                                  e.target.value as "admin" | "member"
                                )
                              }
                              className="h-8 rounded border border-zinc-200 px-2 text-sm"
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          {/* Club Position Select */}
                          <td className="px-6 py-3">
                            <select
                              value={editPosition}
                              onChange={(e) =>
                                setEditPosition(
                                  e.target.value as MemberPosition
                                )
                              }
                              className="h-8 rounded border border-zinc-200 px-2 text-sm"
                            >
                              {POSITIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p.replace("_", " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Domain Select */}
                          <td className="px-6 py-3">
                            <select
                              value={editDomain}
                              onChange={(e) =>
                                setEditDomain(
                                  e.target.value as MemberDomain | "none"
                                )
                              }
                              className="h-8 rounded border border-zinc-200 px-2 text-sm"
                            >
                              <option value="none">— None —</option>
                              {DOMAINS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Date Joined */}
                          <td className="px-6 py-3 text-gray-500 text-sm">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          {/* Save / Cancel buttons */}
                          <td className="px-6 py-3">
                            <div className="flex gap-2 items-center">
                              <Button
                                size="sm"
                                onClick={() => handleSave(member.id)}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {saving ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                              {saveError && (
                                <span className="text-xs text-red-600">
                                  {saveError}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Name + Initials Badge */}
                          <td className="px-6 py-3 font-medium flex items-center gap-2">
                            <RoleBadge position={member.position_title} />
                            <span>{member.full_name}</span>
                          </td>
                          {/* Email */}
                          <td className="px-6 py-3 text-gray-600">
                            {member.email}
                          </td>
                          {/* Phone */}
                          <td className="px-6 py-3 text-gray-600 text-sm">
                            {member.phone || "—"}
                          </td>
                          {/* Auth Role */}
                          <td className="px-6 py-3">
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                                member.role === "admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          {/* Club Position */}
                          <td className="px-6 py-3 text-sm text-gray-700 capitalize">
                            {member.position_title ? member.position_title.replace("_", " ") : "Member"}
                          </td>
                          {/* Domain */}
                          <td className="px-6 py-3">
                            {member.domain ? (
                              <span
                                className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getDomainColorClass(
                                  member.domain
                                )}`}
                              >
                                {member.domain}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">None</span>
                            )}
                          </td>
                          {/* Joined */}
                          <td className="px-6 py-3 text-gray-600">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          {/* Edit button */}
                          <td className="px-6 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(member)}
                            >
                              Edit
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <p className="text-gray-500 text-sm">
          Showing {filteredMembers.length} of {members.length} members
        </p>
      )}

      {/* Delete note */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-800">
        <strong>Note:</strong> To fully remove a member (including preventing
        future login), also delete them from{" "}
        <span className="font-mono bg-yellow-100 px-1 rounded">
          Supabase Dashboard → Authentication → Users
        </span>
        . Removing from this table alone will not prevent re-login.
      </div>
    </div>
  );
}
