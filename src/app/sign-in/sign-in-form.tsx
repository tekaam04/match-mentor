"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
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
      <p className="rounded-md border border-foreground/15 p-4 text-sm">
        Check <strong>{status.email}</strong> for a sign-in link. It expires in 15 minutes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {urlError && status.kind === "idle" && (
        <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
          {urlError}
        </p>
      )}
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="h-11 rounded-md bg-foreground font-medium text-background hover:opacity-90"
          >
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-foreground/50">
            <span className="h-px flex-1 bg-foreground/15" />
            or
            <span className="h-px flex-1 bg-foreground/15" />
          </div>
        </>
      )}
      <form onSubmit={sendMagicLink} className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-md border border-foreground/20 bg-transparent px-3"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="h-11 rounded-md border border-foreground/20 font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {status.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {status.kind === "error" && <p className="text-sm text-red-600">{status.message}</p>}
      </form>
    </div>
  );
}
