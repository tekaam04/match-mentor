import { ArrowRight, HeartHandshake, MessagesSquare, Send, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { Button } from "@/components/ui/button";
import { DEFAULT_TOPICS } from "@/lib/topics";

const STEPS = [
  {
    icon: <Send />,
    title: "Ask for help",
    body: "Tell us what you're working on: an essay draft, SAT prep, a scholarship interview, a visa question.",
  },
  {
    icon: <HeartHandshake />,
    title: "Mentors offer",
    body: "Students who've been through it see your request and offer to help with what they know best.",
  },
  {
    icon: <UserCheck />,
    title: "Get matched",
    body: "A community organizer pairs you with the right mentor, and you take it from there.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_65%)]"
          />
          <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-muted-foreground shadow-xs">
                <Sparkles className="size-4 text-highlight" />
                Built for our 345+ member community
              </p>
              <h1 className="font-heading text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl">
                Get into university with someone who’s{" "}
                <span className="relative whitespace-nowrap text-primary">
                  been there
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 12"
                    className="absolute -bottom-2 left-0 h-3 w-full fill-none stroke-highlight"
                    preserveAspectRatio="none"
                  >
                    <path d="M2 9c40-6 120-8 196-3" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
                Free one-on-one help with tests, essays, recommendation letters, financial aid and visas from current
                university students.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link href="/sign-in">
                    Get help with my applications
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                  <Link href="/sign-in">Become a mentor</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative rounded-2xl border bg-background p-6">
                  <span className="absolute top-6 right-6 font-heading text-4xl font-extrabold text-muted">{i + 1}</span>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground [&_svg]:size-6">
                    {step.icon}
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Help with every part of applying</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The same topics our community already talks about every day, now with a mentor who can give you
                focused, personal advice.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {DEFAULT_TOPICS.map((t) => (
                <li key={t.slug} className="rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-xs">
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <div className="flex gap-4">
              <MessagesSquare className="mt-1 size-8 shrink-0 text-highlight" />
              <div>
                <h2 className="font-heading text-2xl font-bold">Already at university?</h2>
                <p className="mt-2 max-w-xl text-primary-foreground/80">
                  Give back an hour a week. Help applicants with what you wish someone had told you.
                </p>
              </div>
            </div>
            <Button asChild size="lg" variant="secondary" className="h-12 shrink-0 px-6 text-base">
              <Link href="/sign-in">Sign up to mentor</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="text-base" />
          <p>Made by and for our community of applicants and mentors.</p>
        </div>
      </footer>
    </div>
  );
}
