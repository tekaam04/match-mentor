import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasRole, homeFor, isRole, needsOnboarding, type Role } from "@/lib/roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  onboarded: boolean;
};

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, image, role, onboardedAt } = session.user;
  return {
    id,
    name,
    email,
    image: image ?? null,
    role: isRole(role) ? role : "student",
    onboarded: Boolean(onboardedAt),
  };
});

/** Redirects to sign-in when there is no session. Does not require onboarding. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Redirects signed-out users to sign-in, users who haven't finished onboarding to /onboarding,
 * and users without an allowed role to their own home.
 */
export async function requireRole(...allowed: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (needsOnboarding(user)) redirect("/onboarding");
  if (!hasRole(user.role, allowed)) redirect(homeFor(user.role));
  return user;
}

/** Where a signed-in user should land right now. */
export function landingFor(user: CurrentUser): string {
  return needsOnboarding(user) ? "/onboarding" : homeFor(user.role);
}
