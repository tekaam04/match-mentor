import type { MatchEventType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const LABELS: Record<MatchEventType, string> = {
  created: "Matched",
  reassigned: "Moved to a new mentor",
  completed: "Marked complete",
  cancelled: "Match ended",
  note: "Note",
};

type Event = { id: string; type: MatchEventType; createdAt: Date; actor: { name: string } | null; payload: unknown };

function detail(e: Event) {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  if (e.type === "cancelled") {
    const outcome = p.reopen ? "Request reopened" : "Request closed";
    return typeof p.reason === "string" && p.reason ? `${outcome}: ${p.reason}` : outcome;
  }
  if (e.type === "completed" && typeof p.by === "string") return `By the ${p.by}`;
  return null;
}

/** The match's audit log, oldest first. */
export function MatchTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <ol className="space-y-4">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pl-1">
          <span
            className={cn(
              "relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card",
              e.type === "completed" ? "bg-success" : e.type === "cancelled" ? "bg-muted-foreground" : "bg-primary",
            )}
          />
          {i < events.length - 1 && <span aria-hidden className="absolute top-4 left-[0.6rem] h-full w-px bg-border" />}
          <div className="text-sm">
            <p className="font-medium">{LABELS[e.type]}</p>
            <p className="text-muted-foreground">
              {e.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {e.actor ? ` · ${e.actor.name}` : ""}
            </p>
            {detail(e) && <p className="text-muted-foreground">{detail(e)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
