"use server";

import { requireRole } from "@/lib/dal";
import { cancelMatch, createMatch, reassignMatch } from "@/server/matching";
import { reviewMentor } from "@/server/mentoring";
import { changeRole, createInvite, revokeInvite } from "@/server/people";
import { formInput, runAction } from "@/server/run-action";
import type { InviteInput } from "@/server/validation";

export async function reviewMentorAction(mentorId: string, decision: "approved" | "rejected") {
  const user = await requireRole("organizer");
  return runAction(
    () => reviewMentor(user, mentorId, { decision }),
    () => ({ ok: true, message: decision === "approved" ? "Mentor approved." : "Mentor not approved." }),
  );
}

export async function createMatchAction(requestId: string, mentorId: string) {
  const user = await requireRole("organizer");
  return runAction(
    () => createMatch(user, requestId, mentorId),
    (match) => ({ ok: true, message: `Matched with ${match.mentor.name}. We've emailed them both.` }),
  );
}

export async function reassignMatchAction(matchId: string, mentorId: string) {
  const user = await requireRole("organizer");
  return runAction(
    () => reassignMatch(user, matchId, mentorId),
    (match) => ({ ok: true, message: `Moved to ${match.mentor.name}. Everyone has been emailed.` }),
  );
}

export async function cancelMatchAction(matchId: string, formData: FormData) {
  const user = await requireRole("organizer");
  const input = formInput(formData);
  return runAction(
    () => cancelMatch(user, matchId, { reopen: input.reopen ?? "false", reason: input.reason }),
    (match) => ({
      ok: true,
      message: input.reopen === "true" ? "Match ended. The request is back in the queue." : "Match ended and request closed.",
      redirectTo: `/organizer/requests/${match.requestId}`,
    }),
  );
}

export async function createInviteAction(formData: FormData) {
  const user = await requireRole("organizer");
  const input = formInput(formData);
  return runAction(
    () => createInvite(user, { email: String(input.email ?? ""), role: input.role as InviteInput["role"] }),
    (invite) => ({ ok: true, message: `Invitation sent to ${invite.email}.` }),
  );
}

export async function revokeInviteAction(id: string) {
  const user = await requireRole("organizer");
  return runAction(
    () => revokeInvite(user, id),
    () => ({ ok: true, message: "Invitation cancelled." }),
  );
}

export async function changeRoleAction(userId: string, role: string) {
  const user = await requireRole("admin");
  return runAction(
    () => changeRole(user, userId, { role }),
    (updated) => ({ ok: true, message: `${updated.name || updated.email} is now ${updated.role === "admin" || updated.role === "organizer" ? "an" : "a"} ${updated.role}.` }),
  );
}
