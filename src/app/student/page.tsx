import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/app-shell";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";

export default function StudentHome() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <StudentHomeContent />
    </Suspense>
  );
}

async function StudentHomeContent() {
  const user = await requireRole("student");
  const requestCount = await db.mentorshipRequest.count({ where: { studentId: user.id } });

  return (
    <AppShell user={user} title="My requests">
      <p className="text-foreground/70">
        You have {requestCount} request{requestCount === 1 ? "" : "s"}. Creating and tracking requests is coming
        next.
      </p>
    </AppShell>
  );
}
