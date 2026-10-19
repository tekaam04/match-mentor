import type { MeetingFormat, RequestStatus, Urgency } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STATUS: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  open: { label: "Open", className: "bg-secondary text-secondary-foreground" },
  matched: { label: "Matched", className: "bg-success/15 text-success" },
  in_progress: { label: "In progress", className: "bg-warning/20 text-highlight-foreground dark:text-warning" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through decoration-1" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>
      {s.label}
    </span>
  );
}

export const URGENCY_LABELS: Record<Urgency, string> = { low: "Not urgent", normal: "Soon", high: "Urgent" };

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "normal") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        urgency === "high" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      {URGENCY_LABELS[urgency]}
    </span>
  );
}

export const FORMAT_LABELS: Record<MeetingFormat, string> = { chat: "Chat", call: "Video / phone call", in_person: "In person" };

export function TopicChip({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "in 5 days", "today", "3 days ago" relative to now, for deadlines stored as UTC dates. */
export function relativeDays(date: Date, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((date.getTime() - today) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  return days === -1 ? "yesterday" : `${-days} days ago`;
}
