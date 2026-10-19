import { CheckCircle2, Mail, MessageSquareHeart, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { MatchTimeline } from "@/components/match-timeline";
import { PageHeader, PageSkeleton } from "@/components/page";
import { RequestDetails } from "@/components/request-details";
import { formatDate, TopicChip } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { ActionError } from "@/server/errors";
import { getMatch, type MatchDetail } from "@/server/matching";
import { completeMatchAction } from "../actions";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Match" };

export default function MatchPage({ params }: PageProps<"/matches/[id]">) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <Match params={params} />
      </Suspense>
    </div>
  );
}

const STATUS = {
  active: { label: "Active", className: "bg-success/15 text-success" },
  completed: { label: "Completed", className: "bg-secondary text-secondary-foreground" },
  cancelled: { label: "Ended", className: "bg-muted text-muted-foreground" },
} as const;

const BACK = {
  student: { href: "/student", label: "My requests" },
  mentor: { href: "/mentor/matches", label: "My matches" },
  organizer: { href: "/organizer/requests?tab=active", label: "Requests" },
} as const;

async function Match({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("student", "mentor", "organizer");
  const { match, role } = await getMatch(user, id).catch((e) => {
    if (e instanceof ActionError && e.code === "not_found") notFound();
    throw e;
  });
  const { request, mentor } = match;
  const student = request.student;
  const active = match.status === "active";
  const status = STATUS[match.status];

  return (
    <>
      <PageHeader
        back={BACK[role]}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span>
            <TopicChip label={request.topic.label} />
            <span className="text-sm">Matched {formatDate(match.matchedAt)}</span>
          </span>
        }
        actions={
          active ? (
            <ConfirmAction
              action={completeMatchAction.bind(null, match.id)}
              trigger={
                <>
                  <CheckCircle2 />
                  Mark complete
                </>
              }
              title="Mark this match complete?"
              description={
                role === "mentor"
                  ? "Do this once you've helped with this request. The student will be asked for quick feedback."
                  : "Do this once you've got the help you needed. You'll be asked for quick feedback."
              }
              confirmLabel="Mark complete"
            />
          ) : undefined
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {role === "student" && match.status === "completed" && !match.feedback && (
            <Card className="border-highlight/60 bg-highlight/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <MessageSquareHeart className="size-5 text-highlight-foreground dark:text-highlight" />
                  How did it go?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackForm matchId={match.id} mentorName={mentor.name.split(" ")[0]} />
              </CardContent>
            </Card>
          )}
          {match.feedback && role !== "mentor" && <FeedbackSummary feedback={match.feedback} />}
          {active && <NextSteps role={role} match={match} />}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">The request</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestDetails request={request} />
            </CardContent>
          </Card>
          {role === "organizer" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchTimeline events={match.events} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          {role !== "mentor" && (
            <PersonCard
              heading={role === "student" ? "Your mentor" : "Mentor"}
              name={mentor.name}
              email={mentor.email}
              lines={[mentor.mentorProfile?.university, mentor.mentorProfile?.bio]}
            />
          )}
          {role !== "student" && (
            <PersonCard
              heading={role === "mentor" ? "Your student" : "Student"}
              name={student.name}
              email={student.email}
              lines={[
                student.studentProfile?.targetUniversities.length
                  ? `Applying to ${student.studentProfile.targetUniversities.join(", ")}`
                  : null,
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}

function PersonCard({ heading, name, email, lines }: { heading: string; name: string; email: string; lines: (string | null | undefined)[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-heading text-lg font-semibold">{name}</p>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <Mail className="size-4" />
          {email}
        </a>
        {lines.filter(Boolean).map((l) => (
          <p key={l} className="leading-relaxed text-muted-foreground">
            {l}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function NextSteps({ role, match }: { role: "student" | "mentor" | "organizer"; match: MatchDetail }) {
  const steps =
    role === "mentor"
      ? [
          `Email ${match.request.student.name.split(" ")[0]} within two days to introduce yourself.`,
          "Agree on how and when to meet, using the format they asked for.",
          "When you've helped with this request, mark the match complete.",
        ]
      : role === "student"
        ? [
            `${match.mentor.name.split(" ")[0]} will email you within two days. You can also write first.`,
            "Share any drafts or documents ahead of your first conversation.",
            "When you've got the help you needed, mark the match complete.",
          ]
        : ["The mentor should contact the student within two days.", "Either of them can mark the match complete."];

  return (
    <Card className="border-primary/20 bg-secondary/40">
      <CardHeader>
        <CardTitle className="text-base">Next steps</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function FeedbackSummary({ feedback }: { feedback: NonNullable<MatchDetail["feedback"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-0.5" aria-label={`${feedback.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn("size-5", n <= feedback.rating ? "fill-highlight text-highlight" : "text-muted-foreground/30")}
            />
          ))}
        </div>
        {feedback.comment && <p className="text-sm leading-relaxed">{feedback.comment}</p>}
      </CardContent>
    </Card>
  );
}
