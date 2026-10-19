import { Logo } from "@/components/brand";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, type CurrentUser } from "@/lib/dal";
import { needsOnboarding, ROLE_LABELS } from "@/lib/roles";
import { pendingMentorCount } from "@/server/mentoring";

async function navFor(user: CurrentUser): Promise<NavItem[]> {
  if (needsOnboarding(user)) return [];
  switch (user.role) {
    case "student":
      return [
        { href: "/student", label: "My requests" },
        { href: "/student/requests/new", label: "New request" },
        { href: "/student/profile", label: "Profile" },
      ];
    case "mentor":
      return [
        { href: "/mentor", label: "Open requests" },
        { href: "/mentor/profile", label: "Profile" },
      ];
    case "organizer":
    case "admin":
      return [
        { href: "/organizer", label: "Overview" },
        { href: "/organizer/mentors", label: "Mentors", badge: await pendingMentorCount() },
      ];
  }
}

function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Logo href="/dashboard" />
        {children}
      </div>
    </header>
  );
}

export async function AppHeader() {
  const user = await getCurrentUser();
  if (!user) return <HeaderFrame />;
  const nav = await navFor(user);

  return (
    <HeaderFrame>
      <NavLinks items={nav} />
      <div className="ml-auto">
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          roleLabel={ROLE_LABELS[user.role]}
          nav={nav}
        />
      </div>
    </HeaderFrame>
  );
}

export function AppHeaderSkeleton() {
  return (
    <HeaderFrame>
      <div className="ml-auto">
        <Skeleton className="size-9 rounded-full" />
      </div>
    </HeaderFrame>
  );
}
