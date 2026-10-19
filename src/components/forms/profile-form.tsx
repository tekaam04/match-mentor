"use client";

import type { ActionResult } from "@/lib/action-result";
import { Card, CardContent } from "@/components/ui/card";
import { FormError, SubmitButton } from "./fields";
import {
  MentorProfileFields,
  StudentProfileFields,
  type MentorProfileDefaults,
  type StudentProfileDefaults,
  type TopicOption,
} from "./profile-fields";
import { useFormAction } from "./use-form-action";

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  topics: TopicOption[];
} & ({ kind: "student"; defaults: StudentProfileDefaults } | { kind: "mentor"; defaults: MentorProfileDefaults });

export function ProfileForm(props: Props) {
  const { onSubmit, pending, formError, fieldError } = useFormAction(props.action);

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <FormError message={formError} />
          {props.kind === "student" ? (
            <StudentProfileFields topics={props.topics} defaults={props.defaults} fieldError={fieldError} />
          ) : (
            <MentorProfileFields topics={props.topics} defaults={props.defaults} fieldError={fieldError} />
          )}
          <div className="flex justify-end border-t pt-6">
            <SubmitButton pending={pending} size="lg">
              Save profile
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
