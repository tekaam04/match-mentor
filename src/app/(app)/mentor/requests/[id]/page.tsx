import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { RequestDetails } from "@/components/request-details";
import { StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { ActionError } from "@/server/errors";
import { activeMatchCount, getRequestForMentor } from "@/server/mentoring";
import { getMentorProfile } from "@/server/profiles";
import { ResponsePanel } from "./response-panel";

export const metadata: Metadata = { title: "Request" };

export default function MentorRequestPage({ params }: PageProps<"/mentor/requests/[id]">) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <MentorRequest params={params} />
      </Suspense>
    </div>
  );
}

async function MentorRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("mentor");
  const profile = await getMentorProfile(user.id);
  if (profile?.status !== "approved") redirect("/mentor");

  const [request, active] = await Promise.all([
    getRequestForMentor(user, id).catch((e) => {
      if (e instanceof ActionError && e.code === "not_found") notFound();
      throw e;
    }),
    activeMatchCount(user.id),
  ]);
  const student = request.student;

  return (
    <>
      <PageHeader
        back={{ href: "/mentor", label: "Open requests" }}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            {request.status !== "open" && <StatusBadge status={request.status} />}
            <UrgencyBadge urgency={request.urgency} />
            <TopicChip label={request.topic.label} />
          </span>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <RequestDetails request={request} />
          </CardContent>
        </Card>
        <div className="space-y-6 lg:sticky lg:top-24">
          <ResponsePanel
            requestId={request.id}
            isOpen={request.status === "open"}
            atCapacity={active >= profile.capacity}
            current={request.responses[0] ?? null}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                About {student.name.split(" ")[0]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.studentProfile?.bio ? (
                <p className="leading-relaxed">{student.studentProfile.bio}</p>
              ) : (
                <p className="text-muted-foreground">No bio yet.</p>
              )}
              {student.studentProfile?.targetUniversities.length ? (
                <p className="text-muted-foreground">Applying to {student.studentProfile.targetUniversities.join(", ")}</p>
              ) : null}
              <p className="text-muted-foreground">
                {request._count.responses} mentor{request._count.responses === 1 ? " has" : "s have"} offered to help
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
