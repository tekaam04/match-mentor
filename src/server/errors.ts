import type { z } from "zod";

export type ActionErrorCode = "invalid" | "forbidden" | "not_found" | "conflict";

export type FieldErrors = Record<string, string[] | undefined>;

/** An expected failure with a message that is safe to show to the user. */
export class ActionError extends Error {
  constructor(
    readonly code: ActionErrorCode,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export const forbidden = (message = "You don't have permission to do that.") => new ActionError("forbidden", message);
export const notFound = (message = "Not found.") => new ActionError("not_found", message);
export const conflict = (message: string) => new ActionError("conflict", message);

export function invalid(error: z.ZodError): ActionError {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return new ActionError("invalid", "Please fix the highlighted fields.", fieldErrors);
}

/** Parses with a zod schema, throwing an ActionError with per-field messages on failure. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw invalid(result.error);
  return result.data;
}
