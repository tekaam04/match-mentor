import Link from "next/link";
import { cn } from "@/lib/utils";

/** Segmented link tabs driven by a search param, e.g. ?tab=active. */
export function TabsNav({
  label,
  items,
  active,
}: {
  label: string;
  items: { href: string; label: string; count?: number; key: string }[];
  active: string;
}) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1" aria-label={label}>
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            t.key === active && "bg-card text-foreground shadow-xs",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
