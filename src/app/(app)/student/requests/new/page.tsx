import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page";
import { requireRole } from "@/lib/dal";
import { listActiveTopics } from "@/server/topics";
import { createRequestAction } from "../../actions";
import { RequestForm } from "../../request-form";

export const metadata: Metadata = { title: "New request" };

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Ask for help"
        description="Mentors who know this topic will see your request and can offer to help. An organizer then pairs you up."
        back={{ href: "/student", label: "My requests" }}
      />
      <Suspense fallback={<PageSkeleton rows={1} />}>
        <NewRequestForm />
      </Suspense>
    </div>
  );
}

async function NewRequestForm() {
  await requireRole("student");
  const topics = await listActiveTopics();
  return <RequestForm action={createRequestAction} topics={topics} submitLabel="Post request" cancelHref="/student" />;
}
