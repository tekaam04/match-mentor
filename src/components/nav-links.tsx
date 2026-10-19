"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; badge?: number };

/** Most specific matching item wins, so "/student" isn't active on "/student/requests/new". */
export function activeHref(items: NavItem[], pathname: string): string | undefined {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            item.href === active && "bg-secondary text-secondary-foreground hover:bg-secondary",
          )}
        >
          {item.label}
          {item.badge ? (
            <span className="rounded-full bg-highlight px-1.5 text-xs font-semibold text-highlight-foreground">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
