import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { homeFor } from "@/lib/roles";

/** Renders nothing; sends signed-in users to their home. Place inside <Suspense>. */
export async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return null;
}
