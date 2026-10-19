"use server";

import { requireRole } from "@/lib/dal";
import { respondToRequest, withdrawResponse } from "@/server/mentoring";
import { updateMentorProfile } from "@/server/profiles";
import { formInput, runAction } from "@/server/run-action";
import type { MentorProfileInput, ResponseInput } from "@/server/validation";

export async function respondAction(requestId: string, formData: FormData) {
  const user = await requireRole("mentor");
  const input = formInput(formData) as unknown as ResponseInput;
  return runAction(
    () => respondToRequest(user, requestId, input),
    (response) => ({
      ok: true,
      message:
        response.kind === "interested"
          ? "Thanks! An organizer will confirm the match."
          : "Got it. We won't show you this request again.",
      redirectTo: response.kind === "passed" ? "/mentor" : undefined,
    }),
  );
}

export async function withdrawResponseAction(requestId: string) {
  const user = await requireRole("mentor");
  return runAction(
    () => withdrawResponse(user, requestId),
    () => ({ ok: true, message: "Response withdrawn." }),
  );
}

export async function updateMentorProfileAction(formData: FormData) {
  const user = await requireRole("mentor");
  return runAction(
    () => updateMentorProfile(user, formInput(formData) as unknown as MentorProfileInput),
    () => ({ ok: true, message: "Profile saved." }),
  );
}
