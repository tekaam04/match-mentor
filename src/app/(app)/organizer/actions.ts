"use server";

import { requireRole } from "@/lib/dal";
import { reviewMentor } from "@/server/mentoring";
import { runAction } from "@/server/run-action";

export async function reviewMentorAction(mentorId: string, decision: "approved" | "rejected") {
  const user = await requireRole("organizer");
  return runAction(
    () => reviewMentor(user, mentorId, { decision }),
    () => ({ ok: true, message: decision === "approved" ? "Mentor approved." : "Mentor not approved." }),
  );
}
