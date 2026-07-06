"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateUser, uploadAvatar, type MemberDomain } from "@/services/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileImage } from "lucide-react";

const DOMAINS: MemberDomain[] = ["technical", "creatives", "operations", "outreach", "sponsorship"];

export default function ProfilePage() {
  const { profile } = useAuth();

  // ── Profile states ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [domain, setDomain] = useState<MemberDomain | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setDob(profile.date_of_birth || "");
      setDomain((profile.domain as MemberDomain) || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  // ── Profile save ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileMessage(null);
    if (!profile?.id) return;

    if (!fullName.trim()) {
      setProfileMessage({ text: "Name is required.", ok: false });
      return;
    }
    if (!domain) {
      setProfileMessage({ text: "Please select a club domain.", ok: false });
      return;
    }

    setSavingProfile(true);

    const { error } = await updateUser(profile.id, {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      date_of_birth: dob || null,
      domain: domain as MemberDomain,
    });

    if (error) {
      setProfileMessage({ text: "Failed to update profile: " + error, ok: false });
    } else {
      setProfileMessage({ text: "Profile updated successfully!", ok: true });
    }
    setSavingProfile(false);
  };

  // ── Avatar Upload ───────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileMessage(null);
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setSavingProfile(true);
    const { url, error } = await uploadAvatar(profile.id, file);

    if (error) {
      setProfileMessage({ text: "Upload failed: " + error, ok: false });
    } else if (url) {
      setAvatarUrl(url);
      setProfileMessage({ text: "Profile picture uploaded!", ok: true });
    }
    setSavingProfile(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-zinc-950">Profile Settings</h2>
        <p className="text-sm text-zinc-500">
          Update your personal profile information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Profile Picture Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 text-center space-y-4 shadow-sm">
          <div className="w-32 h-32 rounded-full overflow-hidden mx-auto bg-zinc-100 border border-zinc-200 relative flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <FileImage size={48} className="text-zinc-300" />
            )}
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-sm">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={savingProfile}
              />
              Upload Photo
            </label>
          </div>
          <p className="text-[10px] text-zinc-400">JPG, PNG or GIF up to 2MB.</p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-zinc-950 border-b pb-3">Personal Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Full Name *
              </label>
              <Input
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-zinc-50 text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Phone Number
              </label>
              <Input
                placeholder="e.g. +91 99999 88888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Date of Birth
              </label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Club Domain *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as MemberDomain)}
                disabled={savingProfile}
                className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              >
                <option value="">— Select Domain —</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`p-3 rounded-lg text-sm border ${
                profileMessage.ok
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-xl">
              {savingProfile ? "Saving..." : "Save Details"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
