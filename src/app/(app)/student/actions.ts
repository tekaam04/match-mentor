"use server";

import { requireRole } from "@/lib/dal";
import { updateStudentProfile } from "@/server/profiles";
import { cancelRequest, createRequest, updateRequest } from "@/server/requests";
import { formInput, runAction } from "@/server/run-action";
import type { RequestInput, StudentProfileInput } from "@/server/validation";

export async function createRequestAction(formData: FormData) {
  const user = await requireRole("student");
  return runAction(
    () => createRequest(user, formInput(formData) as unknown as RequestInput),
    (request) => ({
      ok: true,
      message: "Request posted. Mentors can see it now.",
      redirectTo: `/student/requests/${request.id}`,
    }),
  );
}

export async function updateRequestAction(id: string, formData: FormData) {
  const user = await requireRole("student");
  return runAction(
    () => updateRequest(user, id, formInput(formData) as unknown as RequestInput),
    () => ({ ok: true, message: "Request updated.", redirectTo: `/student/requests/${id}` }),
  );
}

export async function cancelRequestAction(id: string) {
  const user = await requireRole("student");
  return runAction(
    () => cancelRequest(user, id),
    () => ({ ok: true, message: "Request cancelled." }),
  );
}

export async function updateStudentProfileAction(formData: FormData) {
  const user = await requireRole("student");
  return runAction(
    () => updateStudentProfile(user, formInput(formData) as unknown as StudentProfileInput),
    () => ({ ok: true, message: "Profile saved." }),
  );
}
