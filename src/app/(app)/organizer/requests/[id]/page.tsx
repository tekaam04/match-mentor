import { CheckCircle2, ExternalLink, Mail, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MatchTimeline } from "@/components/match-timeline";
import { PageHeader, PageSkeleton } from "@/components/page";
import { RequestDetails } from "@/components/request-details";
import { formatDate, StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { ActionError } from "@/server/errors";
import { getRequestForOrganizer, suggestMentors, type Suggestion } from "@/server/matching";
import { CancelMatchButton, MatchButton, ReassignButton } from "./match-controls";

export const metadata: Metadata = { title: "Request" };

export default function OrganizerRequestPage({ params }: PageProps<"/organizer/requests/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <OrganizerRequest params={params} />
    </Suspense>
  );
}

async function OrganizerRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("organizer");
  const request = await getRequestForOrganizer(user, id).catch((e) => {
    if (e instanceof ActionError && e.code === "not_found") notFound();
    throw e;
  });
  const match = request.match;
  const activeMatch = match?.status === "active" ? match : null;
  const canMatch = request.status === "open";
  const suggestions = canMatch || activeMatch ? await suggestMentors(user, id) : [];
  const passed = request.responses.filter((r) => r.kind === "passed").length;

  return (
    <>
      <PageHeader
        back={{ href: "/organizer/requests", label: "Requests" }}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <TopicChip label={request.topic.label} />
          </span>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          {activeMatch && (
            <Card className="border-success/40 bg-success/5">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <div>
                    <p className="font-semibold">Matched with {activeMatch.mentor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Since {formatDate(activeMatch.matchedAt)} ·{" "}
                      <a href={`mailto:${activeMatch.mentor.email}`} className="underline-offset-4 hover:underline">
                        {activeMatch.mentor.email}
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="ghost">
                    <Link href={`/matches/${activeMatch.id}`}>
                      <ExternalLink />
                      Open
                    </Link>
                  </Button>
                  <CancelMatchButton matchId={activeMatch.id} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <RequestDetails request={request} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{request.student.name}</p>
              <p>
                <a href={`mailto:${request.student.email}`} className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                  <Mail className="size-4" />
                  {request.student.email}
                </a>
              </p>
              {request.student.studentProfile?.bio && <p className="pt-2 leading-relaxed">{request.student.studentProfile.bio}</p>}
            </CardContent>
          </Card>

          {match && match.events.length > 0 && (
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

        {(canMatch || activeMatch) && (
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Sparkles className="size-5 text-highlight" />
                {activeMatch ? "Move to another mentor" : "Suggested mentors"}
              </CardTitle>
              <CardDescription>
                Offers first, then topic experts, then whoever has the most free spots.
                {passed > 0 && ` ${passed} mentor${passed === 1 ? "" : "s"} passed and ${passed === 1 ? "is" : "are"} hidden.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No approved mentors are available.{" "}
                  <Link href="/organizer/mentors" className="font-medium text-primary underline-offset-4 hover:underline">
                    Review pending mentors
                  </Link>
                </p>
              ) : (
                <ul className="-mx-2 divide-y">
                  {suggestions.slice(0, 8).map((s) => (
                    <SuggestionRow
                      key={s.mentorId}
                      s={s}
                      action={
                        activeMatch ? (
                          <ReassignButton
                            matchId={activeMatch.id}
                            mentorId={s.mentorId}
                            mentorName={s.name}
                            currentMentorName={activeMatch.mentor.name}
                            disabled={s.remaining === 0}
                          />
                        ) : (
                          <MatchButton
                            requestId={request.id}
                            mentorId={s.mentorId}
                            mentorName={s.name}
                            studentName={request.student.name}
                            disabled={s.remaining === 0}
                          />
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function SuggestionRow({ s, action }: { s: Suggestion; action: React.ReactNode }) {
  return (
    <li className="space-y-2 px-2 py-4 first:pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{s.name}</p>
          {s.university && <p className="truncate text-xs text-muted-foreground">{s.university}</p>}
        </div>
        {action}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {s.reasons.map((r) => (
          <span
            key={r}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              r === "Offered to help" && "bg-success/15 text-success",
              r === "Knows this topic" && "bg-secondary text-secondary-foreground",
              r === "At capacity" && "bg-destructive/10 text-destructive",
              !["Offered to help", "Knows this topic", "At capacity"].includes(r) && "bg-muted text-muted-foreground",
            )}
          >
            {r}
          </span>
        ))}
      </div>
      {s.note && <p className="rounded-lg bg-muted/70 p-2.5 text-sm italic">“{s.note}”</p>}
    </li>
  );
}
