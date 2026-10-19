import type { Metadata } from "next";
import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { RequestDetails } from "@/components/request-details";
import { StatusBadge, TopicChip, UrgencyBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import { ActionError } from "@/server/errors";
import { getMyRequest } from "@/server/requests";
import { CancelRequestButton } from "./cancel-request-button";

export const metadata: Metadata = { title: "Request" };

export default function StudentRequestPage({ params }: PageProps<"/student/requests/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <StudentRequest params={params} />
      </Suspense>
    </div>
  );
}

async function StudentRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("student");
  const request = await getMyRequest(user, id).catch((e) => {
    if (e instanceof ActionError && e.code === "not_found") notFound();
    throw e;
  });
  const offers = request._count.responses;
  const isOpen = request.status === "open";
  const match = request.match && request.match.status !== "cancelled" ? request.match : null;

  return (
    <>
      <PageHeader
        back={{ href: "/student", label: "My requests" }}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <TopicChip label={request.topic.label} />
          </span>
        }
        actions={
          isOpen ? (
            <>
              <CancelRequestButton id={request.id} />
              <Button asChild>
                <Link href={`/student/requests/${request.id}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="space-y-6">
        <Card className="border-primary/20 bg-secondary/50">
          <CardContent className="flex flex-wrap items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="size-5" />
            </span>
            <div>
              {match ? (
                <>
                  <p className="font-semibold">
                    {match.status === "completed" ? "You worked with" : "You’re matched with"} {match.mentor.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {match.status === "completed"
                      ? "This match is complete."
                      : "See their contact details and next steps on your match page."}
                  </p>
                </>
              ) : isOpen ? (
                <>
                  <p className="font-semibold">
                    {offers === 0
                      ? "Waiting for mentors"
                      : `${offers} mentor${offers === 1 ? " has" : "s have"} offered to help`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {offers === 0
                      ? "Mentors who know this topic can see your request. You'll hear from us once you're matched."
                      : "An organizer will pair you with the best fit shortly."}
                  </p>
                </>
              ) : (
                <p className="font-semibold">This request is {request.status === "cancelled" ? "cancelled" : "closed"}.</p>
              )}
            </div>
            {match && (
              <Button asChild className="sm:ml-auto">
                <Link href={`/matches/${match.id}`}>Open match</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <RequestDetails request={request} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
