import { MemberDomain } from "@/services/members";

export function getDomainColorClass(domain: MemberDomain | string | null): string {
  if (!domain) return "bg-zinc-100 text-zinc-700 border-zinc-200";
  
  switch (domain.toLowerCase()) {
    case "technical":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "creatives":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "operations":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "outreach":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "sponsorship":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}
