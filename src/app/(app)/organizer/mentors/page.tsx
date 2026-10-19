import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { formatDate, TopicChip } from "@/components/status";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { listMentorsByStatus } from "@/server/mentoring";
import { ReviewButtons } from "./review-buttons";

export const metadata: Metadata = { title: "Mentors" };

const TABS = [
  { status: "pending", label: "Waiting for review" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Declined" },
] as const;
type Status = (typeof TABS)[number]["status"];

export default function OrganizerMentorsPage({ searchParams }: PageProps<"/organizer/mentors">) {
  return (
    <>
      <PageHeader title="Mentors" description="Approve new mentors before they can see and respond to requests." />
      <Suspense fallback={<PageSkeleton />}>
        <MentorList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MentorList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("organizer");
  const raw = (await searchParams).status;
  const status: Status = TABS.some((t) => t.status === raw) ? (raw as Status) : "pending";
  const mentors = await listMentorsByStatus(user, status);

  return (
    <>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1" aria-label="Filter mentors">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={t.status === "pending" ? "/organizer/mentors" : `/organizer/mentors?status=${t.status}`}
            aria-current={t.status === status ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              t.status === status && "bg-card text-foreground shadow-xs",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {mentors.length === 0 ? (
        <EmptyState icon={<UserCheck />} title={status === "pending" ? "No one is waiting" : "Nobody here yet"}>
          {status === "pending" ? "New mentor sign-ups will appear here for review." : null}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {mentors.map((m) => (
            <li key={m.userId} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-semibold">{m.user.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {m.university ?? "University not given"} · {m.user.email} · joined {formatDate(m.user.createdAt)}
                  </p>
                </div>
                <ReviewButtons mentorId={m.userId} current={m.status} />
              </div>
              {m.bio && <p className="mt-3 text-sm leading-relaxed">{m.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.topics.map((t) => (
                  <TopicChip key={t.label} label={t.label} />
                ))}
                <span className="text-xs text-muted-foreground self-center">Up to {m.capacity} students</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
