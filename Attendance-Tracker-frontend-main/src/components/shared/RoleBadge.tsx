import React from "react";
import { MemberPosition } from "@/services/members";

interface RoleBadgeProps {
  position: MemberPosition | string | null;
}

export function RoleBadge({ position }: RoleBadgeProps) {
  if (!position || position === "member") return null;

  let initials = "";
  let label = "";

  switch (position) {
    case "president":
      initials = "P";
      label = "President";
      break;
    case "vice_president":
      initials = "VP";
      label = "Vice President";
      break;
    case "hr":
      initials = "HR";
      label = "HR";
      break;
    case "lead":
      initials = "L";
      label = "Lead";
      break;
    case "associate_lead":
      initials = "AL";
      label = "Associate Lead";
      break;
    default:
      return null;
  }

  return (
    <span
      title={label}
      className="inline-flex items-center justify-center font-bold text-blue-700 bg-white border-[3.5px] border-yellow-400 rounded-md w-8 h-8 text-xs select-none shadow-sm cursor-help mr-1"
    >
      {initials}
    </span>
  );
}
