"use client";

import { Send, X } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { changeRoleAction, createInviteAction, revokeInviteAction } from "../actions";

const selectClass =
  "h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function InviteForm({ roles }: { roles: Role[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { onSubmit, pending, fieldError } = useFormAction(createInviteAction, {
    onSuccess: () => formRef.current?.reset(),
  });
  const error = fieldError("email") ?? fieldError("role");

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="invite-email" className="sr-only">
            Email
          </Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            aria-invalid={fieldError("email") ? true : undefined}
          />
        </div>
        <Label htmlFor="invite-role" className="sr-only">
          Role
        </Label>
        <select id="invite-role" name="role" defaultValue="mentor" className={selectClass}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <SubmitButton pending={pending} pendingLabel="Sending…" className="h-10">
          <Send />
          Send invite
        </SubmitButton>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeInviteAction(id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        })
      }
    >
      <X />
      Cancel
    </Button>
  );
}

export function RoleSelect({ userId, role, name }: { userId: string; role: Role; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label={`Role for ${name}`}
      defaultValue={role}
      disabled={pending}
      className={`${selectClass} h-9`}
      onChange={(e) => {
        const select = e.currentTarget;
        const next = select.value;
        if (!confirm(`Change ${name}'s role to ${ROLE_LABELS[next as Role]}?`)) {
          select.value = role;
          return;
        }
        startTransition(async () => {
          const result = await changeRoleAction(userId, next);
          if (result.ok) toast.success(result.message);
          else {
            toast.error(result.error);
            select.value = role;
          }
        });
      }}
    >
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
