import Link from "next/link";
import { Logo } from "@/components/brand";
import { SITE } from "@/lib/site";

/** Shared layout for the privacy policy and terms pages. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16 sm:px-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.legalUpdated}</p>
        <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo className="text-base" />
        <nav className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <a href={`mailto:${SITE.contactEmail}`} className="hover:text-foreground">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
