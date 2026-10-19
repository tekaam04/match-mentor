"use client";

import { ArrowLeft, GraduationCap, HeartHandshake } from "lucide-react";
import { useState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/forms/fields";
import { MentorProfileFields, StudentProfileFields, type TopicOption } from "@/components/forms/profile-fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

type Path = "student" | "mentor";

const PATHS: { value: Path; title: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "student",
    title: "I'm applying to university",
    description: "Ask for help with tests, essays, letters, financial aid, visas and more.",
    icon: <GraduationCap />,
  },
  {
    value: "mentor",
    title: "I want to mentor",
    description: "Help applicants with what you've been through. An organizer approves new mentors.",
    icon: <HeartHandshake />,
  },
];

export function OnboardingForm({ topics, name }: { topics: TopicOption[]; name: string }) {
  const firstName = name.split(" ")[0] ?? "";
  const [path, setPath] = useState<Path | null>(null);
  const { onSubmit, pending, formError, fieldError } = useFormAction(completeOnboardingAction);

  if (!path) {
    return (
      <div className="space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Welcome{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="text-muted-foreground">How will you use Match Mentor?</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PATHS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPath(p.value)}
              className="group flex flex-col gap-3 rounded-2xl border bg-card p-6 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:size-6">
                {p.icon}
              </span>
              <span className="font-heading text-lg font-semibold">{p.title}</span>
              <span className="text-sm text-muted-foreground">{p.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isMentor = path === "mentor";
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setPath(null)} className="-ml-2 text-muted-foreground">
        <ArrowLeft />
        Back
      </Button>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {isMentor ? "Your mentor profile" : "Tell us about your applications"}
        </h1>
        <p className="text-muted-foreground">
          {isMentor
            ? "Organizers use this to approve you, and students see it when you offer to help."
            : "This helps us find the right mentor. You can change it any time."}
        </p>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <input type="hidden" name="path" value={path} />
            <FormError message={formError} />
            <TextField
              name="name"
              label="Your name"
              placeholder="First and last name"
              autoComplete="name"
              required
              maxLength={80}
              defaultValue={name}
              hint={isMentor ? "Shown to students you help." : "Shown to mentors who help you."}
              error={fieldError("name")}
            />
            {isMentor ? (
              <MentorProfileFields topics={topics} fieldError={fieldError} />
            ) : (
              <StudentProfileFields topics={topics} fieldError={fieldError} />
            )}
            <div className={cn("flex justify-end border-t pt-6")}>
              <SubmitButton pending={pending} size="lg">
                {isMentor ? "Submit for approval" : "Continue"}
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
