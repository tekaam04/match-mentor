import { CalendarDays, Inbox, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { relativeDays, StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { TabsNav } from "@/components/tabs-nav";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { listQueue, queueCounts, type QueueTab } from "@/server/matching";
import { staleCutoff } from "@/server/metrics";

export const metadata: Metadata = { title: "Requests" };

const TABS: { key: QueueTab; label: string }[] = [
  { key: "open", label: "Needs a match" },
  { key: "active", label: "Matched" },
  { key: "closed", label: "Closed" },
];

export default function OrganizerRequestsPage({ searchParams }: PageProps<"/organizer/requests">) {
  return (
    <>
      <PageHeader
        title="Requests"
        description="Pair each open request with a mentor. Mentors who offered to help are suggested first."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function waitingDays(createdAt: Date) {
  return Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);
}

async function Queue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("organizer");
  const raw = (await searchParams).tab;
  const tab: QueueTab = TABS.some((t) => t.key === raw) ? (raw as QueueTab) : "open";
  const [items, counts] = await Promise.all([listQueue(user, tab), queueCounts(user)]);

  return (
    <>
      <TabsNav
        label="Filter requests"
        active={tab}
        items={TABS.map((t) => ({
          key: t.key,
          label: t.label,
          count: counts[t.key],
          href: t.key === "open" ? "/organizer/requests" : `/organizer/requests?tab=${t.key}`,
        }))}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Inbox />} title={tab === "open" ? "Every request has a mentor" : "Nothing here yet"}>
          {tab === "open" ? "New requests from students will show up here." : null}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const days = waitingDays(r.createdAt);
            return (
              <li key={r.id}>
                <Link
                  href={`/organizer/requests/${r.id}`}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {tab !== "open" && <StatusBadge status={r.status} />}
                      <UrgencyBadge urgency={r.urgency} />
                      <TopicChip label={r.topic.label} />
                    </div>
                    <h3 className="mt-2 truncate font-heading text-lg font-semibold">{r.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{r.student.name}</span>
                      {r.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-4" />
                          Deadline {relativeDays(r.deadline)}
                        </span>
                      )}
                      {r.match && r.match.status === "active" && <span>Mentor: {r.match.mentor.name}</span>}
                      {r.match?.status === "active" && r.match.matchedAt < staleCutoff() && (
                        <span className="font-medium text-highlight-foreground dark:text-warning">
                          Quiet for {waitingDays(r.match.matchedAt)} days
                        </span>
                      )}
                    </div>
                  </div>
                  {tab === "open" && (
                    <div className="flex shrink-0 gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          r._count.responses > 0 ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        <Users className="size-4" />
                        {r._count.responses} offer{r._count.responses === 1 ? "" : "s"}
                      </span>
                      <span className={cn("text-muted-foreground", days >= 3 && "font-medium text-destructive")}>
                        {days === 0 ? "Posted today" : `Waiting ${days} day${days === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
