import Link from "next/link";
import type { CurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ user, title, children }: { user: CurrentUser; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/dashboard" className="font-semibold">
            Match Mentor
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-foreground/70 sm:inline">{user.name || user.email}</span>
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium">
              {ROLE_LABELS[user.role]}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-6 font-semibold">Match Mentor</div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
      </main>
    </div>
  );
}
