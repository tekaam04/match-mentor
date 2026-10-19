"use client";

import { FormError, RadioCards, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import type { TopicOption } from "@/components/forms/profile-fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActionResult } from "@/lib/action-result";
import Link from "next/link";

export type RequestDefaults = {
  topicId?: string;
  title?: string;
  description?: string;
  targetUniversities?: string[];
  deadline?: string;
  urgency?: string;
  format?: string;
  availability?: string | null;
};

export function RequestForm({
  action,
  topics,
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  topics: TopicOption[];
  defaults?: RequestDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const { onSubmit, pending, formError, fieldError } = useFormAction(action);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-7" noValidate>
          <FormError message={formError} />
          <SelectField
            name="topicId"
            label="Topic"
            placeholder="Choose a topic"
            required
            defaultValue={defaults.topicId}
            options={topics.map((t) => ({ value: t.id, label: t.label }))}
            error={fieldError("topicId")}
          />
          <TextField
            name="title"
            label="What do you need help with?"
            placeholder="Feedback on my Common App essay"
            required
            maxLength={120}
            defaultValue={defaults.title}
            error={fieldError("title")}
          />
          <TextAreaField
            name="description"
            label="Details"
            placeholder="Where you are now, what you've tried, and what a mentor could help with."
            hint="The more specific you are, the faster a mentor can help."
            required
            maxLength={2000}
            rows={6}
            defaultValue={defaults.description}
            error={fieldError("description")}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              name="targetUniversities"
              label="Universities this is for"
              placeholder="MIT, Yale"
              hint="Separate with commas."
              optional
              defaultValue={defaults.targetUniversities?.join(", ")}
              error={fieldError("targetUniversities")}
            />
            <TextField
              name="deadline"
              label="Deadline"
              type="date"
              min={today}
              optional
              defaultValue={defaults.deadline}
              error={fieldError("deadline")}
            />
          </div>
          <RadioCards
            name="urgency"
            label="How urgent is it?"
            defaultValue={defaults.urgency ?? "normal"}
            error={fieldError("urgency")}
            options={[
              { value: "low", label: "Not urgent", description: "Any time in the next few weeks" },
              { value: "normal", label: "Soon", description: "Within a week or two" },
              { value: "high", label: "Urgent", description: "Deadline in the next few days" },
            ]}
          />
          <RadioCards
            name="format"
            label="How would you like to meet?"
            defaultValue={defaults.format ?? "chat"}
            error={fieldError("format")}
            options={[
              { value: "chat", label: "Chat", description: "Telegram, WhatsApp or messages" },
              { value: "call", label: "Call", description: "Video or phone" },
              { value: "in_person", label: "In person", description: "If you're nearby" },
            ]}
          />
          <TextField
            name="availability"
            label="When are you free?"
            placeholder="Weekday evenings, Saturday mornings (EAT)"
            optional
            defaultValue={defaults.availability}
            error={fieldError("availability")}
          />
          <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
            <SubmitButton pending={pending} size="lg">
              {submitLabel}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
