import { HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { formatDate, TopicChip } from "@/components/status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { listMyMatches } from "@/server/matching";

export const metadata: Metadata = { title: "My matches" };

export default function MentorMatchesPage() {
  return (
    <>
      <PageHeader title="My matches" description="Students you're helping now, and the ones you've helped before." />
      <Suspense fallback={<PageSkeleton />}>
        <Matches />
      </Suspense>
    </>
  );
}

async function Matches() {
  const user = await requireRole("mentor");
  const matches = await listMyMatches(user);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<HeartHandshake />}
        title="No matches yet"
        action={
          <Button asChild>
            <Link href="/mentor">Browse open requests</Link>
          </Button>
        }
      >
        Offer to help with a request, and an organizer will match you with the student.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-3">
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            href={`/matches/${m.id}`}
            className="flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    m.status === "active" ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.status === "active" ? "Active" : "Completed"}
                </span>
                <TopicChip label={m.request.topic.label} />
              </div>
              <h3 className="mt-2 truncate font-heading text-lg font-semibold">{m.request.title}</h3>
              <p className="text-sm text-muted-foreground">
                {m.request.student.name} · matched {formatDate(m.matchedAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
