import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { googleEnabled } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Match Mentor</h1>
        <p className="text-sm text-foreground/70">New here? Signing in creates your account.</p>
      </div>
      <SignInForm googleEnabled={googleEnabled} />
    </main>
  );
}
