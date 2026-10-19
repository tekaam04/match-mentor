"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function signInWithGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/dashboard" });
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
