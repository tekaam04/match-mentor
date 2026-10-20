import { AlertTriangle, ArrowRight, Clock, GraduationCap, HeartHandshake, Inbox, Link2, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { daysBetween, formatDuration, formatPercent } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { getAttentionItems, getDashboardMetrics, STALE_AFTER_DAYS } from "@/server/metrics";

export const metadata: Metadata = { title: "Overview" };

export default function OrganizerHome() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <OrganizerHomeContent />
    </Suspense>
  );
}

async function OrganizerHomeContent() {
  const user = await requireRole("organizer");
  const now = new Date();
  const [m, attention] = await Promise.all([getDashboardMetrics(user, now), getAttentionItems(user, now)]);
  const finished = m.completedMatches + m.endedMatches + m.staleMatches;

  const outcomes = [
    {
      label: "Match completion rate",
      value: formatPercent(m.completionRate),
      note: finished ? `${m.completedMatches} of ${finished} finished matches` : "No finished matches yet",
    },
    { label: "Time to match", value: formatDuration(m.medianDaysToMatch), note: "Median, request posted → matched" },
    { label: "Time to complete", value: formatDuration(m.medianDaysToComplete), note: "Median, matched → completed" },
    {
      label: "Student rating",
      value: m.averageRating === null ? "—" : `${m.averageRating.toFixed(1)} / 5`,
      note: `${m.ratingCount} rating${m.ratingCount === 1 ? "" : "s"}`,
    },
  ];

  const counts = [
    { label: "Students", value: m.students, icon: <GraduationCap />, href: "/organizer/people?role=student" },
    {
      label: "Approved mentors",
      value: m.approvedMentors,
      icon: <HeartHandshake />,
      href: "/organizer/mentors?status=approved",
      note: m.pendingMentors ? `${m.pendingMentors} waiting for approval` : undefined,
    },
    {
      label: "Need a match",
      value: m.openRequests,
      icon: <Inbox />,
      href: "/organizer/requests",
      note: `${m.openWithoutOffers} with no offers yet`,
    },
    {
      label: "Active matches",
      value: m.activeMatches,
      icon: <Link2 />,
      href: "/organizer/requests?tab=active",
      note: m.staleMatches ? `${m.staleMatches} quiet for ${STALE_AFTER_DAYS}+ days` : undefined,
      warn: m.staleMatches > 0,
    },
  ];

  const utilization = m.mentorUtilization ?? 0;

  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="How the pilot is going." />

      {m.pendingMentors > 0 && (
        <Link
          href="/organizer/mentors"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-highlight/60 bg-highlight/15 p-4 transition-colors hover:bg-highlight/25"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
            <UserCheck className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">
              {m.pendingMentors} mentor{m.pendingMentors === 1 ? " is" : "s are"} waiting for approval
            </span>
            <span className="text-sm text-muted-foreground">Review their profiles so they can start helping.</span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      <section aria-labelledby="outcomes" className="mb-8">
        <h2 id="outcomes" className="sr-only">
          Outcomes
        </h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {outcomes.map((o, i) => (
            <Card key={o.label} className={i === 0 ? "border-primary/30 bg-secondary/40" : undefined}>
              <CardContent>
                <dt className="text-sm font-medium text-muted-foreground">{o.label}</dt>
                <dd className="mt-2 font-heading text-3xl font-bold tabular-nums">{o.value}</dd>
                <p className="mt-1 text-xs text-muted-foreground">{o.note}</p>
              </CardContent>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="community" className="mb-8">
        <h2 id="community" className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Community
        </h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {counts.map((s) => (
            <Card key={s.label} className={cn("relative transition-shadow hover:shadow-md", s.warn && "border-warning/50")}>
              <CardContent>
                <Link href={s.href} className="absolute inset-0 rounded-xl" aria-label={s.label} />
                <div className="flex items-center justify-between text-muted-foreground [&_svg]:size-5">
                  <dt className="text-sm font-medium">{s.label}</dt>
                  {s.icon}
                </div>
                <dd className="mt-2 font-heading text-3xl font-bold tabular-nums">{s.value}</dd>
                {s.note && (
                  <p className={cn("mt-1 text-xs text-muted-foreground", s.warn && "font-medium text-highlight-foreground dark:text-warning")}>
                    {s.note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </dl>
        <Card className="mt-4">
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Mentor capacity in use</span>
              <span className="tabular-nums text-muted-foreground">{formatPercent(m.mentorUtilization)}</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label="Mentor capacity in use"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(utilization * 100)}
            >
              <div
                className={cn("h-full rounded-full", utilization >= 0.85 ? "bg-warning" : "bg-primary")}
                style={{ width: `${Math.min(100, utilization * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {utilization >= 0.85
                ? "Mentors are nearly full. Invite more mentors or ask current ones to raise their limit."
                : "Active matches compared with how many students approved mentors said they can take."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="attention" className="grid gap-6 lg:grid-cols-2">
        <h2 id="attention" className="sr-only">
          Needs attention
        </h2>
        <AttentionList
          title="Quiet matches"
          description={`Active for ${STALE_AFTER_DAYS}+ days without being completed. Check in with the pair.`}
          icon={<AlertTriangle />}
          empty="Every active match is recent."
          items={attention.staleMatches.map((s) => ({
            href: `/matches/${s.id}`,
            title: s.request.title,
            meta: `${s.request.student.name} & ${s.mentor.name} · ${Math.floor(daysBetween(s.matchedAt, now))} days`,
          }))}
        />
        <AttentionList
          title="Waiting for a mentor"
          description="Open for 3+ days. Consider matching them directly."
          icon={<Clock />}
          empty="No request has waited more than 3 days."
          items={attention.waitingRequests.map((r) => ({
            href: `/organizer/requests/${r.id}`,
            title: r.title,
            meta: `${r.student.name} · ${Math.floor(daysBetween(r.createdAt, now))} days`,
          }))}
        />
      </section>
    </>
  );
}

function AttentionList({
  title,
  description,
  icon,
  empty,
  items,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  empty: string;
  items: { href: string; title: string; meta: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {title}
          {items.length > 0 && (
            <span className="rounded-full bg-highlight/25 px-2 text-xs text-highlight-foreground">{items.length}</span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="-mx-2">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="block rounded-lg px-2 py-2 hover:bg-muted">
                  <span className="block truncate text-sm font-medium">{i.title}</span>
                  <span className="block text-xs text-muted-foreground">{i.meta}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
