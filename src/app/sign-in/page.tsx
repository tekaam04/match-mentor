import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { Card, CardContent } from "@/components/ui/card";
import { googleEnabled } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_70%)]"
      />
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Logo />
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Welcome</h1>
            <p className="text-sm text-muted-foreground">Sign in or create your account. It’s free.</p>
          </div>
        </div>
        <Card className="shadow-lg shadow-primary/5">
          <CardContent>
            {/* The form reads ?error= from the URL, which must happen behind a Suspense boundary. */}
            <Suspense fallback={null}>
              <SignInForm googleEnabled={googleEnabled} />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to treat everyone in the community with respect.
        </p>
      </div>
    </div>
  );
}
