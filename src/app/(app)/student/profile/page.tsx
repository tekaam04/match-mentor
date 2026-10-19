import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader, PageSkeleton } from "@/components/page";
import { requireRole } from "@/lib/dal";
import { getStudentProfile } from "@/server/profiles";
import { listActiveTopics } from "@/server/topics";
import { updateStudentProfileAction } from "../actions";

export const metadata: Metadata = { title: "Profile" };

export default function StudentProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Your profile" description="Mentors see this when they look at your requests." />
      <Suspense fallback={<PageSkeleton rows={1} />}>
        <StudentProfile />
      </Suspense>
    </div>
  );
}

async function StudentProfile() {
  const user = await requireRole("student");
  const [profile, topics] = await Promise.all([getStudentProfile(user.id), listActiveTopics()]);
  return (
    <ProfileForm
      kind="student"
      action={updateStudentProfileAction}
      topics={topics}
      defaults={{
        bio: profile?.bio,
        targetUniversities: profile?.targetUniversities,
        availability: profile?.availability,
        topicIds: profile?.topics.map((t) => t.id),
      }}
    />
  );
}
