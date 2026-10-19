import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader, PageSkeleton } from "@/components/page";
import { requireRole } from "@/lib/dal";
import { getMentorProfile } from "@/server/profiles";
import { listActiveTopics } from "@/server/topics";
import { updateMentorProfileAction } from "../actions";

export const metadata: Metadata = { title: "Mentor profile" };

const STATUS_NOTE = {
  pending: "Waiting for organizer approval",
  approved: "Approved mentor",
  rejected: "Not approved",
} as const;

export default function MentorProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton rows={1} />}>
        <MentorProfile />
      </Suspense>
    </div>
  );
}

async function MentorProfile() {
  const user = await requireRole("mentor");
  const [profile, topics] = await Promise.all([getMentorProfile(user.id), listActiveTopics()]);
  return (
    <>
      <PageHeader
        title="Your mentor profile"
        description={
          <>
            Students and organizers see this.{" "}
            <span className="font-medium text-foreground">{STATUS_NOTE[profile?.status ?? "pending"]}.</span>
          </>
        }
      />
      <ProfileForm
        kind="mentor"
        action={updateMentorProfileAction}
        topics={topics}
        defaults={{
          university: profile?.university,
          bio: profile?.bio,
          availability: profile?.availability,
          capacity: profile?.capacity,
          topicIds: profile?.topics.map((t) => t.id),
        }}
      />
    </>
  );
}
