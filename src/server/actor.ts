import type { Role } from "@/lib/roles";
import { hasRole } from "@/lib/roles";
import { forbidden } from "./errors";

/** Who is performing an action. Services authorize against this, never against client input. */
export type Actor = { id: string; role: Role };

export function assertRole(actor: Actor, ...allowed: Role[]): void {
  if (!hasRole(actor.role, allowed)) throw forbidden();
}
