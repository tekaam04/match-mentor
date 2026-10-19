"use client";

import { Loader2, Mail, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

/** Messages for the ?error= codes Better Auth redirects back with. */
const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "That sign-in attempt was already used or timed out. Please try again.",
  please_restart_the_process: "That sign-in attempt timed out. Please try again.",
  EXPIRED_TOKEN: "That sign-in link has expired. Request a new one below.",
  INVALID_TOKEN: "That sign-in link is invalid or was already used. Request a new one below.",
  ATTEMPTS_EXCEEDED: "That sign-in link was already used. Request a new one below.",
  access_denied: "Google sign-in was cancelled.",
};

function messageFor(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Sign-in didn't complete. Please try again.";
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const urlError = messageFor(useSearchParams().get("error"));

  async function signInWithGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard", errorCallbackURL: "/sign-in" });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
      errorCallbackURL: "/sign-in",
    });
    setStatus(error ? { kind: "error", message: error.message ?? "Something went wrong." } : { kind: "sent", email });
  }

  if (status.kind === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-6" />
        </span>
        <p className="font-semibold">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong className="text-foreground">{status.email}</strong>. It expires in 15
          minutes.
        </p>
        <Button variant="link" size="sm" onClick={() => setStatus({ kind: "idle" })}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {urlError && status.kind === "idle" && (
        <Alert variant="destructive">
          <AlertDescription>{urlError}</AlertDescription>
        </Alert>
      )}
      {googleEnabled && (
        <>
          <Button type="button" variant="outline" size="lg" onClick={signInWithGoogle} className="w-full">
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or use your email
            <Separator className="flex-1" />
          </div>
        </>
      )}
      <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11"
          />
        </div>
        <Button type="submit" size="lg" disabled={status.kind === "sending"} className="w-full">
          {status.kind === "sending" ? <Loader2 className="animate-spin" /> : <Mail />}
          {status.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
        {status.kind === "error" && <p className="text-sm text-destructive">{status.message}</p>}
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
