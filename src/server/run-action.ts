import "server-only";
import { refresh } from "next/cache";
import type { ActionResult, ActionSuccess } from "@/lib/action-result";
import { ActionError } from "./errors";

/**
 * Runs a service call from a server action. Expected failures (ActionError) become a result the
 * form can display; anything else (including redirects) propagates.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
  onSuccess: (value: T) => ActionSuccess = () => ({ ok: true }),
): Promise<ActionResult> {
  try {
    const value = await fn();
    refresh();
    return onSuccess(value);
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** FormData → plain object; keys that appear more than once (checkbox groups) become arrays. */
export function formInput(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = values.length > 1 ? values : (values[0] ?? "");
  }
  return out;
}
