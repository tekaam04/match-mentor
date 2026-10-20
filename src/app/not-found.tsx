import { SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <SearchX className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">We couldn’t find that page</h1>
        <p className="max-w-sm text-muted-foreground">
          It may have been removed, or you may not have access to it. Check the link or head back home.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">Go to my home page</Link>
      </Button>
    </main>
  );
}
