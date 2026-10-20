"use server";

import { landingFor, requireUser } from "@/lib/dal";
import { completeOnboarding } from "@/server/profiles";
import { formInput, runAction } from "@/server/run-action";
import type { OnboardingInput } from "@/server/validation";

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();
  return runAction(
    () => completeOnboarding(user, formInput(formData) as unknown as OnboardingInput),
    (updated) => ({
      ok: true,
      message:
        updated.role === "mentor" && user.role !== "mentor"
          ? "Thanks! An organizer will review your mentor profile."
          : "You're all set!",
      redirectTo: landingFor({ ...user, role: updated.role, onboarded: true }),
    }),
  );
}
