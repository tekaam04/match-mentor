"use client";

import { CheckCircle2, HeartHandshake, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { FormError, SubmitButton, TextAreaField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { respondAction, withdrawResponseAction } from "../../actions";

type Props = {
  requestId: string;
  isOpen: boolean;
  atCapacity: boolean;
  current: { kind: "interested" | "passed"; note: string | null } | null;
};

export function ResponsePanel({ requestId, isOpen, atCapacity, current }: Props) {
  const router = useRouter();
  const { onSubmit, pending, formError, fieldError } = useFormAction(respondAction.bind(null, requestId));
  const [withdrawing, startWithdraw] = useTransition();

  function withdraw() {
    startWithdraw(async () => {
      const result = await withdrawResponseAction(requestId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  if (current) {
    const interested = current.kind === "interested";
    return (
      <Card className={interested ? "border-success/40 bg-success/5" : undefined}>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            {interested ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">{interested ? "You offered to help" : "You passed on this request"}</p>
              <p className="text-sm text-muted-foreground">
                {interested
                  ? isOpen
                    ? "An organizer will confirm the match and introduce you."
                    : "This request is no longer open."
                  : "It's hidden from your feed."}
              </p>
              {current.note && <p className="mt-3 rounded-lg bg-card p-3 text-sm italic">“{current.note}”</p>}
            </div>
          </div>
          {isOpen && (
            <Button variant="outline" size="sm" onClick={withdraw} disabled={withdrawing}>
              {withdrawing ? "Withdrawing…" : interested ? "Withdraw my offer" : "Undo pass"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <HeartHandshake className="size-5 text-primary" />
          Can you help?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />
          <TextAreaField
            name="note"
            label="Note for the organizer"
            placeholder="Why you're a good fit, or when you could meet."
            optional
            maxLength={500}
            rows={3}
            error={fieldError("note")}
          />
          {atCapacity && (
            <p className="text-sm text-muted-foreground">
              You’re at your active-match limit. Raise it in your profile to offer help.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton
              pending={pending}
              pendingLabel="Sending…"
              name="kind"
              value="interested"
              size="lg"
              disabled={atCapacity || pending}
              className="sm:flex-1"
            >
              I can help
            </SubmitButton>
            <Button type="submit" name="kind" value="passed" variant="outline" size="lg" disabled={pending}>
              Not for me
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
