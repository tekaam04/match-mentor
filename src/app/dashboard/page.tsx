import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/dal";
import { homeFor } from "@/lib/roles";

/** Post-sign-in landing: sends each user to their role's home. */
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToHome />
    </Suspense>
  );
}

async function RedirectToHome() {
  const user = await requireUser();
  redirect(homeFor(user.role));
  return null;
}
