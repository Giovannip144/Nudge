import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Get initials from a full name — "Sarah Müller" → "SM" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Consistent avatar background colors based on lead ID */
const AVATAR_COLORS = [
  { bg: "rgba(61,107,61,0.2)",  border: "rgba(61,107,61,0.4)",  text: "#3d6b3d" },
  { bg: "rgba(107,61,61,0.2)",  border: "rgba(107,61,61,0.4)",  text: "#6b3d3d" },
  { bg: "rgba(61,79,107,0.2)",  border: "rgba(61,79,107,0.4)",  text: "#3d4f6b" },
  { bg: "rgba(107,90,61,0.2)",  border: "rgba(107,90,61,0.4)",  text: "#6b5a3d" },
  { bg: "rgba(79,61,107,0.2)",  border: "rgba(79,61,107,0.4)",  text: "#4f3d6b" },
  { bg: "rgba(61,107,90,0.2)",  border: "rgba(61,107,90,0.4)",  text: "#3d6b5a" },
  { bg: "rgba(107,61,86,0.2)",  border: "rgba(107,61,86,0.4)",  text: "#6b3d56" },
  { bg: "rgba(90,107,61,0.2)",  border: "rgba(90,107,61,0.4)",  text: "#5a6b3d" },
];

export function getAvatarColor(id: string) {
  // Sum char codes for a stable hash
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** How many days since a date string "YYYY-MM-DD" */
export function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Human-readable relative time: "3 days ago", "just now", etc. */
export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const days = daysSince(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** Truncate text to max length with ellipsis */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/** Status label map */
export const STATUS_LABELS: Record<string, string> = {
  new:    "New",
  active: "Active",
  warm:   "Warm",
  won:    "Won ✓",
  paused: "Paused",
  lost:   "Lost",
};

/** Status colour classes (Tailwind-safe) */
export const STATUS_CLASSES: Record<string, string> = {
  new:    "bg-blue-500/10 text-blue-400 border border-blue-400/20",
  active: "bg-accent/10 text-accent border border-accent/20",
  warm:   "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  won:    "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20",
  paused: "bg-white/5 text-nudge-muted border border-white/10",
  lost:   "bg-red-400/10 text-red-400 border border-red-400/20",
};
