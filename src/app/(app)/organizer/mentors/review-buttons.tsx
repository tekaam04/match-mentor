"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewMentorAction } from "../actions";

export function ReviewButtons({ mentorId, current }: { mentorId: string; current: "pending" | "approved" | "rejected" }) {
  const [pending, startTransition] = useTransition();

  function review(decision: "approved" | "rejected") {
    startTransition(async () => {
      const result = await reviewMentorAction(mentorId, decision);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex gap-2">
      {current !== "rejected" && (
        <Button variant="outline" size="sm" onClick={() => review("rejected")} disabled={pending}>
          <X />
          {current === "approved" ? "Revoke" : "Decline"}
        </Button>
      )}
      {current !== "approved" && (
        <Button size="sm" onClick={() => review("approved")} disabled={pending}>
          <Check />
          Approve
        </Button>
      )}
    </div>
  );
}
