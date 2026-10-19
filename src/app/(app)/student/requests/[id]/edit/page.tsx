import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { requireRole } from "@/lib/dal";
import { ActionError } from "@/server/errors";
import { getMyRequest } from "@/server/requests";
import { listActiveTopics } from "@/server/topics";
import { updateRequestAction } from "../../../actions";
import { RequestForm } from "../../../request-form";

export const metadata: Metadata = { title: "Edit request" };

export default function EditRequestPage({ params }: PageProps<"/student/requests/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton rows={1} />}>
        <EditRequest params={params} />
      </Suspense>
    </div>
  );
}

async function EditRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("student");
  const [request, topics] = await Promise.all([
    getMyRequest(user, id).catch((e) => {
      if (e instanceof ActionError && e.code === "not_found") notFound();
      throw e;
    }),
    listActiveTopics(),
  ]);
  if (request.status !== "open") redirect(`/student/requests/${id}`);

  return (
    <>
      <PageHeader title="Edit request" back={{ href: `/student/requests/${id}`, label: "Back to request" }} />
      <RequestForm
        action={updateRequestAction.bind(null, id)}
        topics={topics}
        submitLabel="Save changes"
        cancelHref={`/student/requests/${id}`}
        defaults={{
          topicId: request.topicId,
          title: request.title,
          description: request.description,
          targetUniversities: request.targetUniversities,
          deadline: request.deadline?.toISOString().slice(0, 10),
          urgency: request.urgency,
          format: request.format,
          availability: request.availability,
        }}
      />
    </>
  );
}
