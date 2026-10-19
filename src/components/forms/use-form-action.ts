"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult, ActionSuccess } from "@/lib/action-result";

/**
 * Submits a form to a server action without React's automatic form reset, so typed values survive
 * validation errors. Shows a toast and navigates on success.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<ActionResult>,
  options: { onSuccess?: (result: ActionSuccess) => void } = {},
) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name) formData.set(submitter.name, submitter.value);

    startTransition(async () => {
      const next = await action(formData);
      setResult(next);
      if (next.ok) {
        if (next.message) toast.success(next.message);
        if (next.redirectTo) router.push(next.redirectTo);
        options.onSuccess?.(next);
      } else if (!next.fieldErrors) {
        toast.error(next.error);
      }
    });
  }

  const failure = result && !result.ok ? result : null;
  return {
    onSubmit,
    pending,
    formError: failure?.fieldErrors ? failure.error : null,
    fieldError: (name: string) => failure?.fieldErrors?.[name]?.[0],
  };
}
