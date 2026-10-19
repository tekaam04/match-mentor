import Link from "next/link";
import { cn } from "@/lib/utils";

/** Two people joined by a line: the "match". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <circle cx="11" cy="12" r="3.5" className="fill-primary-foreground" />
      <circle cx="21" cy="12" r="3.5" className="fill-highlight" />
      <path
        d="M6.5 23.5c0-3 2-5 4.5-5s4 1.6 5 3.2c1-1.6 2.5-3.2 5-3.2s4.5 2 4.5 5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)}>
      <LogoMark />
      <span>
        Match<span className="text-primary">Mentor</span>
      </span>
    </Link>
  );
}
