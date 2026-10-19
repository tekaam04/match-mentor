"use server";

import { requireRole } from "@/lib/dal";
import { completeMatch, submitFeedback } from "@/server/matching";
import { formInput, runAction } from "@/server/run-action";
import type { FeedbackInput } from "@/server/validation";

export async function completeMatchAction(matchId: string) {
  const user = await requireRole("student", "mentor", "organizer");
  return runAction(
    () => completeMatch(user, matchId),
    () => ({ ok: true, message: "Marked complete. Thank you!" }),
  );
}

export async function submitFeedbackAction(matchId: string, formData: FormData) {
  const user = await requireRole("student");
  return runAction(
    () => submitFeedback(user, matchId, formInput(formData) as unknown as FeedbackInput),
    () => ({ ok: true, message: "Thanks for your feedback!" }),
  );
}
