"use client";

import { ArrowRightLeft, Check, Link2Off } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { FormError, SubmitButton, TextAreaField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelMatchAction, createMatchAction, reassignMatchAction } from "../../actions";

export function MatchButton({
  requestId,
  mentorId,
  mentorName,
  studentName,
  disabled,
}: {
  requestId: string;
  mentorId: string;
  mentorName: string;
  studentName: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Button size="sm" variant="outline" disabled>
        No free spots
      </Button>
    );
  }
  return (
    <ConfirmAction
      action={createMatchAction.bind(null, requestId, mentorId)}
      trigger={
        <>
          <Check />
          Match
        </>
      }
      triggerSize="sm"
      title={`Match ${studentName} with ${mentorName}?`}
      description="We'll email both of them with each other's contact details so they can start."
      confirmLabel="Confirm match"
    />
  );
}

export function ReassignButton({
  matchId,
  mentorId,
  mentorName,
  currentMentorName,
  disabled,
}: {
  matchId: string;
  mentorId: string;
  mentorName: string;
  currentMentorName: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Button size="sm" variant="outline" disabled>
        No free spots
      </Button>
    );
  }
  return (
    <ConfirmAction
      action={reassignMatchAction.bind(null, matchId, mentorId)}
      trigger={
        <>
          <ArrowRightLeft />
          Move here
        </>
      }
      triggerVariant="outline"
      triggerSize="sm"
      title={`Move this match to ${mentorName}?`}
      description={`${currentMentorName} will be told the match has moved, and ${mentorName} and the student will get each other's contact details.`}
      confirmLabel="Move match"
    />
  );
}

export function CancelMatchButton({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const { onSubmit, pending, formError, fieldError } = useFormAction(cancelMatchAction.bind(null, matchId), {
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2Off />
          End match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <DialogHeader>
            <DialogTitle>End this match?</DialogTitle>
            <DialogDescription>Use this if the pair can’t work together or the student no longer needs help.</DialogDescription>
          </DialogHeader>
          <FormError message={formError} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">What should happen to the request?</legend>
            {[
              { value: "true", label: "Put it back in the queue", hint: "Match the student with someone else." },
              { value: "false", label: "Close it", hint: "The student no longer needs help." },
            ].map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-secondary"
              >
                <input type="radio" name="reopen" value={o.value} defaultChecked={o.value === "true"} className="mt-1 accent-primary" />
                <span>
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <TextAreaField name="reason" label="Reason" optional rows={2} maxLength={300} error={fieldError("reason")} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Keep the match
              </Button>
            </DialogClose>
            <SubmitButton pending={pending} pendingLabel="Ending…" variant="destructive">
              End match
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
