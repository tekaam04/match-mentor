import { ArrowRight, GraduationCap, HeartHandshake, Inbox, Link2, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { pendingMentorCount } from "@/server/mentoring";

export const metadata: Metadata = { title: "Overview" };

export default function OrganizerHome() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <OrganizerHomeContent />
    </Suspense>
  );
}

async function OrganizerHomeContent() {
  const user = await requireRole("organizer");
  const [students, mentors, openRequests, unanswered, activeMatches, pendingMentors] = await Promise.all([
    db.user.count({ where: { role: "student" } }),
    db.mentorProfile.count({ where: { status: "approved", user: { role: "mentor" } } }),
    db.mentorshipRequest.count({ where: { status: "open" } }),
    db.mentorshipRequest.count({ where: { status: "open", responses: { none: { kind: "interested" } } } }),
    db.match.count({ where: { status: "active" } }),
    pendingMentorCount(),
  ]);

  const stats = [
    { label: "Students", value: students, icon: <GraduationCap /> },
    { label: "Approved mentors", value: mentors, icon: <HeartHandshake /> },
    { label: "Open requests", value: openRequests, icon: <Inbox />, note: `${unanswered} with no offers yet` },
    { label: "Active matches", value: activeMatches, icon: <Link2 /> },
  ];

  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="How the community is doing today." />
      {pendingMentors > 0 && (
        <Link
          href="/organizer/mentors"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-highlight/60 bg-highlight/15 p-4 transition-colors hover:bg-highlight/25"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
            <UserCheck className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">
              {pendingMentors} mentor{pendingMentors === 1 ? " is" : "s are"} waiting for approval
            </span>
            <span className="text-sm text-muted-foreground">Review their profiles so they can start helping.</span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <div className="flex items-center justify-between text-muted-foreground [&_svg]:size-5">
                <dt className="text-sm font-medium">{s.label}</dt>
                {s.icon}
              </div>
              <dd className="mt-2 font-heading text-3xl font-bold tabular-nums">{s.value}</dd>
              {s.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
            </CardContent>
          </Card>
        ))}
      </dl>
    </>
  );
}
