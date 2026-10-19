import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({ id, label, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: unknown) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

type TextFieldProps = Omit<FieldProps, "children" | "id"> & {
  name: string;
  defaultValue?: string | number | null;
} & Omit<React.ComponentProps<"input">, "defaultValue" | "name">;

export function TextField({ name, label, hint, error, optional, defaultValue, className, ...input }: TextFieldProps) {
  return (
    <Field id={name} label={label} hint={hint} error={error} optional={optional} className={className}>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        {...input}
      />
    </Field>
  );
}

type TextAreaFieldProps = Omit<FieldProps, "children" | "id"> & {
  name: string;
  defaultValue?: string | null;
} & Omit<React.ComponentProps<"textarea">, "defaultValue" | "name">;

export function TextAreaField({ name, label, hint, error, optional, defaultValue, className, ...rest }: TextAreaFieldProps) {
  return (
    <Field id={name} label={label} hint={hint} error={error} optional={optional} className={className}>
      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className="min-h-28"
        {...rest}
      />
    </Field>
  );
}

type SelectFieldProps = Omit<FieldProps, "children" | "id"> & {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
};

/** A styled native <select>: reliable in forms and comfortable on phones. */
export function SelectField({ name, label, hint, error, optional, defaultValue, placeholder, options, required, className }: SelectFieldProps) {
  return (
    <Field id={name} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

type ChoiceOption = { value: string; label: string; description?: string };

/** Pill-style multi-select checkboxes, e.g. topics. */
export function CheckboxPills({
  name,
  label,
  hint,
  error,
  optional,
  options,
  defaultValues = [],
}: Omit<FieldProps, "children" | "id"> & { name: string; options: ChoiceOption[]; defaultValues?: string[] }) {
  return (
    <fieldset className="space-y-2" aria-describedby={describedBy(name, error, hint)}>
      <legend className="flex items-center gap-2 text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-full border bg-card px-3 py-1.5 text-sm font-medium transition-colors select-none hover:border-primary/40 has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Card-style single choice, e.g. urgency or meeting format. */
export function RadioCards({
  name,
  label,
  error,
  options,
  defaultValue,
  columns = 3,
}: {
  name: string;
  label: string;
  error?: string;
  options: ChoiceOption[];
  defaultValue?: string;
  columns?: 2 | 3;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className={cn("grid gap-2 pt-1", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="sr-only" />
            <span className="block text-sm font-semibold">{o.label}</span>
            {o.description && <span className="mt-0.5 block text-xs text-muted-foreground">{o.description}</span>}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel = "Saving…",
  ...props
}: React.ComponentProps<typeof Button> & { pending: boolean; pendingLabel?: string }) {
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
