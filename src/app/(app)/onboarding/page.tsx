import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page";
import { landingFor, requireUser } from "@/lib/dal";
import { needsOnboarding } from "@/lib/roles";
import { listActiveTopics } from "@/server/topics";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Get started" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <Onboarding />
      </Suspense>
    </div>
  );
}

async function Onboarding() {
  const user = await requireUser();
  if (!needsOnboarding(user)) redirect(landingFor(user));
  const topics = await listActiveTopics();
  return <OnboardingForm topics={topics} name={user.name} />;
}
