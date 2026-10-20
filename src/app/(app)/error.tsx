"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          This page didn’t load properly. Try again, and if it keeps happening, let an organizer know.
        </p>
        {digest && <p className="text-xs text-muted-foreground">Error code: {digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
