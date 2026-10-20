import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, type Role } from "@/lib/roles";
import { assertRole, type Actor } from "./actor";
import { conflict, forbidden, notFound, parse } from "./errors";
import { notifyInvited } from "./notifications";
import { inviteSchema, roleChangeSchema, type InviteInput } from "./validation";

export const INVITE_DAYS = 14;

/** Staff roles can only be granted by admins; organizers can invite students and mentors. */
function assertCanGrant(actor: Actor, role: Role) {
  if ((role === "organizer" || role === "admin") && !hasRole(actor.role, ["admin"])) {
    throw forbidden("Only admins can invite organizers or admins.");
  }
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export async function listInvites(actor: Actor, now = new Date()) {
  assertRole(actor, "organizer");
  return db.invite.findMany({
    where: { usedAt: null, expiresAt: { gt: now } },
    include: { invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Invites an email address with a role. Re-inviting the same address refreshes the invite. */
export async function createInvite(actor: Actor, raw: InviteInput) {
  assertRole(actor, "organizer");
  const input = parse(inviteSchema, raw);
  assertCanGrant(actor, input.role);

  if (await db.user.findUnique({ where: { email: input.email } })) {
    throw conflict("That person already has an account. An admin can change their role on the People page.");
  }

  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  const existing = await db.invite.findFirst({ where: { email: input.email, usedAt: null } });
  const invite = existing
    ? await db.invite.update({
        where: { id: existing.id },
        data: { role: input.role, expiresAt, invitedById: actor.id },
      })
    : await db.invite.create({
        data: {
          email: input.email,
          role: input.role,
          expiresAt,
          invitedById: actor.id,
          token: randomBytes(24).toString("base64url"),
        },
      });

  const inviter = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } });
  await notifyInvited(input.email, input.role, inviter.name || "An organizer");
  return invite;
}

export async function revokeInvite(actor: Actor, id: string) {
  assertRole(actor, "organizer");
  const invite = await db.invite.findUnique({ where: { id } });
  if (!invite || invite.usedAt) throw notFound("Invite not found.");
  assertCanGrant(actor, invite.role);
  await db.invite.delete({ where: { id } });
}

/** The unused, unexpired invite for an email, if any. Used when an account is first created. */
export function findPendingInvite(email: string, now = new Date()) {
  return db.invite.findFirst({
    where: { email: email.trim().toLowerCase(), usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
}

export async function markInviteUsed(email: string) {
  await db.invite.updateMany({
    where: { email: email.trim().toLowerCase(), usedAt: null },
    data: { usedAt: new Date() },
  });
}

/** True when this person joined through a mentor invite, so they skip the approval queue. */
export async function wasInvitedAsMentor(email: string) {
  return (await db.invite.count({ where: { email: email.toLowerCase(), role: "mentor", usedAt: { not: null } } })) > 0;
}

// ─── People ──────────────────────────────────────────────────────────────────

export async function listPeople(actor: Actor, opts: { q?: string; role?: Role } = {}) {
  assertRole(actor, "organizer");
  const q = opts.q?.trim();
  const where: Prisma.UserWhereInput = {
    ...(opts.role ? { role: opts.role } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  return db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      onboardedAt: true,
      createdAt: true,
      mentorProfile: { select: { status: true } },
      _count: { select: { requests: true, mentorMatches: { where: { status: "active" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export type Person = Awaited<ReturnType<typeof listPeople>>[number];

/** Admins change someone's role. Guards against locking yourself out and orphaning active matches. */
export async function changeRole(actor: Actor, userId: string, raw: { role: unknown }) {
  assertRole(actor, "admin");
  const { role } = parse(roleChangeSchema, raw);
  if (userId === actor.id) throw conflict("You can't change your own role.");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { mentorMatches: { where: { status: "active" } } } } },
  });
  if (!user) throw notFound("Person not found.");
  if (user.role === role) return user;
  if (user.role === "mentor" && user._count.mentorMatches > 0) {
    throw conflict("This mentor has active matches. Move or end them before changing their role.");
  }

  return db.$transaction(async (tx) => {
    if (role === "mentor") {
      // An admin promoting someone is an approval; they fill in the rest of the profile themselves.
      await tx.mentorProfile.upsert({
        where: { userId },
        create: { userId, status: "approved", reviewedAt: new Date(), reviewedById: actor.id },
        update: { status: "approved", reviewedAt: new Date(), reviewedById: actor.id },
      });
    }
    return tx.user.update({ where: { id: userId }, data: { role } });
  });
}
