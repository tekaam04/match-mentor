import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/app-shell";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";

export default function MentorHome() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <MentorHomeContent />
    </Suspense>
  );
}

async function MentorHomeContent() {
  const user = await requireRole("mentor");
  const openCount = await db.mentorshipRequest.count({ where: { status: "open" } });

  return (
    <AppShell user={user} title="Open requests">
      <p className="text-foreground/70">
        {openCount} open request{openCount === 1 ? " is" : "s are"} waiting for a mentor. Browsing and responding is
        coming next.
      </p>
    </AppShell>
  );
}
