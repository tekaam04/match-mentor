"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { FormError, SubmitButton, TextAreaField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { cn } from "@/lib/utils";
import { submitFeedbackAction } from "../actions";

const LABELS = ["", "Not helpful", "A little helpful", "Helpful", "Very helpful", "Amazing"];

export function FeedbackForm({ matchId, mentorName }: { matchId: string; mentorName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const { onSubmit, pending, formError, fieldError } = useFormAction(submitFeedbackAction.bind(null, matchId));
  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={formError} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">How helpful was {mentorName}?</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-md p-1 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
                aria-label={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n]}`}
              />
              <Star
                onMouseEnter={() => setHover(n)}
                className={cn(
                  "size-8 transition-colors",
                  n <= shown ? "fill-highlight text-highlight" : "text-muted-foreground/40",
                )}
              />
            </label>
          ))}
          <span className="ml-2 text-sm font-medium text-muted-foreground">{LABELS[shown]}</span>
        </div>
        {fieldError("rating") && <p className="mt-1 text-sm text-destructive">{fieldError("rating")}</p>}
      </fieldset>
      <TextAreaField
        name="comment"
        label="Anything else?"
        placeholder="What went well, and what could be better?"
        optional
        rows={3}
        maxLength={1000}
        error={fieldError("comment")}
      />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send feedback
      </SubmitButton>
    </form>
  );
}
