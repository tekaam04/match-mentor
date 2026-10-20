import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/page";
import { formatDate } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/dal";
import { hasRole, isRole, ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { listInvites, listPeople, type Person } from "@/server/people";
import { InviteForm, RevokeInviteButton, RoleSelect } from "./people-controls";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage({ searchParams }: PageProps<"/organizer/people">) {
  return (
    <>
      <PageHeader title="People" description="Invite people and see everyone in the community." />
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <People searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function People({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("organizer");
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const roleParam = first(params.role);
  const role = isRole(roleParam) ? roleParam : undefined;
  const isAdmin = hasRole(user.role, ["admin"]);
  const [invites, people] = await Promise.all([listInvites(user), listPeople(user, { q, role })]);
  const invitable: Role[] = isAdmin ? [...ROLES] : ["student", "mentor"];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Invite someone</CardTitle>
          <CardDescription>
            They’ll get an email with a sign-in link. Invited mentors skip the approval queue.
            {!isAdmin && " Only admins can invite organizers."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <InviteForm roles={invitable} />
          {invites.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Waiting to join ({invites.length})</h3>
              <ul className="divide-y rounded-xl border">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{i.email}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {ROLE_LABELS[i.role]}
                    </span>
                    <span className="text-muted-foreground">expires {formatDate(i.expiresAt)}</span>
                    {(isAdmin || i.role === "student" || i.role === "mentor") && <RevokeInviteButton id={i.id} />}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <form className="flex flex-col gap-2 sm:flex-row" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Search by name or email" className="pl-9" aria-label="Search people" />
          </div>
          <select
            name="role"
            defaultValue={role ?? ""}
            aria-label="Filter by role"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm dark:bg-input/30"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}s
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" className="h-10">
            Search
          </Button>
        </form>

        {people.length === 0 ? (
          <EmptyState icon={<Users />} title="No one found">
            Try a different search.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <p className="border-b px-4 py-2.5 text-sm text-muted-foreground">
              {people.length} {people.length === 1 ? "person" : "people"}
            </p>
            <ul className="divide-y">
              {people.map((p) => (
                <PersonRow key={p.id} person={p} editable={isAdmin && p.id !== user.id} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function PersonRow({ person: p, editable }: { person: Person; editable: boolean }) {
  const notes = [
    !p.onboardedAt && (p.role === "student" || p.role === "mentor") ? "Hasn’t finished sign-up" : null,
    p.role === "mentor" && p.mentorProfile?.status === "pending" ? "Waiting for approval" : null,
    p.role === "mentor" && p._count.mentorMatches > 0 ? `${p._count.mentorMatches} active` : null,
    p.role === "student" && p._count.requests > 0 ? `${p._count.requests} request${p._count.requests === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.name || "—"}</p>
        <p className="truncate text-sm text-muted-foreground">{p.email}</p>
      </div>
      <p className="text-xs text-muted-foreground sm:w-48 sm:text-right">
        {notes.length ? notes.join(" · ") : `Joined ${formatDate(p.createdAt)}`}
      </p>
      {editable ? (
        <RoleSelect userId={p.id} role={p.role} name={p.name || p.email} />
      ) : (
        <span
          className={cn(
            "w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold",
            p.role === "admin" || p.role === "organizer" ? "bg-highlight/25 text-highlight-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {ROLE_LABELS[p.role]}
        </span>
      )}
    </li>
  );
}
