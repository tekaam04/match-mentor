import { redirect } from "next/navigation";
import { getCurrentUser, landingFor } from "@/lib/dal";

/** Renders nothing; sends signed-in users to their home. Place inside <Suspense>. */
export async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect(landingFor(user));
  return null;
}
