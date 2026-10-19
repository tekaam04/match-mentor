import { CalendarDays, Inbox, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { relativeDays, StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/dal";
import { listMyRequests, type StudentRequest } from "@/server/requests";

export const metadata: Metadata = { title: "My requests" };

export default function StudentHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentHomeContent />
    </Suspense>
  );
}

const newRequestButton = (
  <Button asChild size="lg">
    <Link href="/student/requests/new">
      <Plus />
      New request
    </Link>
  </Button>
);

async function StudentHomeContent() {
  const user = await requireRole("student");
  const requests = await listMyRequests(user);
  const active = requests.filter((r) => r.status !== "cancelled" && r.status !== "completed");
  const past = requests.filter((r) => r.status === "cancelled" || r.status === "completed");

  return (
    <>
      <PageHeader
        title="My requests"
        description="Ask for help, see which mentors offered, and follow your matches."
        actions={requests.length > 0 ? newRequestButton : undefined}
      />
      {requests.length === 0 ? (
        <EmptyState icon={<Inbox />} title="No requests yet" action={newRequestButton}>
          Tell mentors what you need help with: an essay, the SAT, a scholarship interview or anything else about
          applying.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          <RequestList requests={active} empty="No active requests." />
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Past</h2>
              <RequestList requests={past} />
            </section>
          )}
        </div>
      )}
    </>
  );
}

function RequestList({ requests, empty }: { requests: StudentRequest[]; empty?: string }) {
  if (requests.length === 0) return empty ? <p className="text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="space-y-3">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/student/requests/${r.id}`}
            className="block rounded-2xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} />
              <UrgencyBadge urgency={r.urgency} />
              <TopicChip label={r.topic.label} />
            </div>
            <h3 className="mt-3 font-heading text-lg font-semibold">{r.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {r.match && r.match.status !== "cancelled" ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-success">
                  <Users className="size-4" />
                  Matched with {r.match.mentor.name}
                </span>
              ) : r.status === "open" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />
                  {r._count.responses === 0
                    ? "Waiting for mentors"
                    : `${r._count.responses} mentor${r._count.responses === 1 ? "" : "s"} offered to help`}
                </span>
              ) : null}
              {r.deadline && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  Deadline {relativeDays(r.deadline)}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
