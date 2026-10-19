/** What every server action returns to the client. */
export type ActionSuccess = { ok: true; message?: string; redirectTo?: string };
export type ActionFailure = { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
export type ActionResult = ActionSuccess | ActionFailure;
