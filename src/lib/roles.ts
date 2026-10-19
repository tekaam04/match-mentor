import type { Role } from "@/generated/prisma/enums";

export type { Role };

export const ROLES = ["student", "mentor", "organizer", "admin"] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  mentor: "Mentor",
  organizer: "Organizer",
  admin: "Admin",
};

/** Roles that implicitly hold another role's permissions. */
const INHERITS: Partial<Record<Role, Role[]>> = {
  admin: ["organizer"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True when `role` is one of `allowed`, or inherits one of them. */
export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  if (allowed.includes(role)) return true;
  return (INHERITS[role] ?? []).some((r) => allowed.includes(r));
}

/** The landing page for each role after sign-in. */
export function homeFor(role: Role): string {
  switch (role) {
    case "student":
      return "/student";
    case "mentor":
      return "/mentor";
    case "organizer":
    case "admin":
      return "/organizer";
  }
}

/** Students and mentors pick their path and fill in a profile first; staff roles skip onboarding. */
export function needsOnboarding(user: { role: Role; onboarded: boolean }): boolean {
  return !user.onboarded && (user.role === "student" || user.role === "mentor");
}
