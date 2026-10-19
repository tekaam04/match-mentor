import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-4xl font-semibold tracking-tight">Match Mentor</h1>
      <p className="text-lg text-foreground/70">
        Get one-on-one help with university applications — SAT, essays, recommendation letters, financial
        aid, visas and more — from students who have been through it.
      </p>
      <div>
        <Link
          href="/sign-in"
          className="inline-flex h-11 items-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
