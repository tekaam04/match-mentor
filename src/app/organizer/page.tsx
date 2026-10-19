import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/app-shell";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS, ROLES } from "@/lib/roles";

export default function OrganizerHome() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <OrganizerHomeContent />
    </Suspense>
  );
}

async function OrganizerHomeContent() {
  const user = await requireRole("organizer");
  const [byRole, openRequests, activeMatches] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.mentorshipRequest.count({ where: { status: "open" } }),
    db.match.count({ where: { status: "active" } }),
  ]);
  const roleCount = (role: string) => byRole.find((r) => r.role === role)?._count._all ?? 0;

  const stats = [
    ...ROLES.map((role) => ({ label: `${ROLE_LABELS[role]}s`, value: roleCount(role) })),
    { label: "Open requests", value: openRequests },
    { label: "Active matches", value: activeMatches },
  ];

  return (
    <AppShell user={user} title="Organizer overview">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-foreground/10 p-4">
            <dt className="text-sm text-foreground/60">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </AppShell>
  );
}
