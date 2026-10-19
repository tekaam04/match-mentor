import { CalendarDays, CheckCircle2, Clock, Inbox, Users, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { relativeDays, StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { activeMatchCount, listFeed, type FeedRequest, type FeedScope } from "@/server/mentoring";
import { getMentorProfile } from "@/server/profiles";

export const metadata: Metadata = { title: "Open requests" };

const TABS: { scope: FeedScope; label: string }[] = [
  { scope: "mine", label: "My topics" },
  { scope: "all", label: "All open" },
  { scope: "responded", label: "My responses" },
];

function parseScope(value: string | string[] | undefined): FeedScope {
  return TABS.some((t) => t.scope === value) ? (value as FeedScope) : "mine";
}

export default function MentorHome({ searchParams }: PageProps<"/mentor">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MentorHomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MentorHomeContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("mentor");
  const profile = await getMentorProfile(user.id);

  if (profile?.status !== "approved") {
    return <ApprovalStatus status={profile?.status ?? "pending"} />;
  }

  const scope = parseScope((await searchParams).scope);
  const [requests, active] = await Promise.all([listFeed(user, scope), activeMatchCount(user.id)]);
  const full = active >= profile.capacity;

  return (
    <>
      <PageHeader
        title="Open requests"
        description="Offer to help with requests that fit what you know. An organizer confirms each match."
        actions={
          <div
            className={cn(
              "rounded-xl border bg-card px-4 py-2 text-sm",
              full && "border-warning/50 bg-warning/10",
            )}
          >
            <span className="text-muted-foreground">Active matches </span>
            <span className="font-semibold tabular-nums">
              {active} / {profile.capacity}
            </span>
          </div>
        }
      />
      {full && (
        <p className="mb-6 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          You’re at your limit of {profile.capacity} active matches, so you can’t offer to help right now.{" "}
          <Link href="/mentor/profile" className="font-medium underline underline-offset-4">
            Raise your limit
          </Link>{" "}
          or finish a match first.
        </p>
      )}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1" aria-label="Filter requests">
        {TABS.map((t) => (
          <Link
            key={t.scope}
            href={t.scope === "mine" ? "/mentor" : `/mentor?scope=${t.scope}`}
            aria-current={t.scope === scope ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              t.scope === scope && "bg-card text-foreground shadow-xs",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {requests.length === 0 ? (
        <EmptyState icon={<Inbox />} title={emptyTitle(scope)}>
          {scope === "mine" ? (
            <>
              New requests in your topics will show up here.{" "}
              <Link href="/mentor?scope=all" className="font-medium text-primary underline-offset-4 hover:underline">
                See all open requests
              </Link>
            </>
          ) : scope === "responded" ? (
            "Requests you offer to help with or pass on will show up here."
          ) : (
            "There are no open requests right now. Check back soon."
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <FeedItem key={r.id} request={r} />
          ))}
        </ul>
      )}
    </>
  );
}

function emptyTitle(scope: FeedScope) {
  if (scope === "mine") return "You're all caught up";
  if (scope === "responded") return "No responses yet";
  return "No open requests";
}

function FeedItem({ request: r }: { request: FeedRequest }) {
  const mine = r.responses[0];
  return (
    <li>
      <Link
        href={`/mentor/requests/${r.id}`}
        className="block rounded-2xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex flex-wrap items-center gap-2">
          <TopicChip label={r.topic.label} />
          <UrgencyBadge urgency={r.urgency} />
          {r.status !== "open" && <StatusBadge status={r.status} />}
          {mine && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-xs font-semibold",
                mine.kind === "interested" ? "text-success" : "text-muted-foreground",
              )}
            >
              {mine.kind === "interested" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {mine.kind === "interested" ? "You offered to help" : "You passed"}
            </span>
          )}
        </div>
        <h3 className="mt-3 font-heading text-lg font-semibold">{r.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>{r.student.name.split(" ")[0]}</span>
          {r.targetUniversities.length > 0 && <span>{r.targetUniversities.join(", ")}</span>}
          {r.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              Deadline {relativeDays(r.deadline)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" />
            {r._count.responses} offer{r._count.responses === 1 ? "" : "s"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function ApprovalStatus({ status }: { status: "pending" | "rejected" }) {
  return (
    <div className="mx-auto max-w-xl pt-6">
      <EmptyState
        icon={status === "pending" ? <Clock /> : <XCircle />}
        title={status === "pending" ? "Your mentor profile is under review" : "Your mentor application wasn't approved"}
        action={
          <Button asChild variant="outline">
            <Link href="/mentor/profile">{status === "pending" ? "Review your profile" : "Update your profile"}</Link>
          </Button>
        }
      >
        {status === "pending"
          ? "An organizer will review your profile soon. Once you're approved, open requests will appear here."
          : "If you think this is a mistake, contact an organizer in the community group."}
      </EmptyState>
    </div>
  );
}
