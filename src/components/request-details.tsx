import { CalendarDays, Clock, GraduationCap, MessageCircle } from "lucide-react";
import type { MeetingFormat, Urgency } from "@/generated/prisma/enums";
import { FORMAT_LABELS, formatDate, relativeDays, URGENCY_LABELS } from "@/components/status";

type Details = {
  description: string;
  targetUniversities: string[];
  deadline: Date | null;
  urgency: Urgency;
  format: MeetingFormat;
  availability: string | null;
  createdAt: Date;
};

/** The body of a request, shared by the student and mentor views. */
export function RequestDetails({ request }: { request: Details }) {
  const facts = [
    {
      icon: <CalendarDays />,
      label: "Deadline",
      value: request.deadline ? `${formatDate(request.deadline)} (${relativeDays(request.deadline)})` : "No fixed deadline",
    },
    { icon: <Clock />, label: "Urgency", value: URGENCY_LABELS[request.urgency] },
    { icon: <MessageCircle />, label: "Format", value: FORMAT_LABELS[request.format] },
    {
      icon: <GraduationCap />,
      label: "Universities",
      value: request.targetUniversities.length ? request.targetUniversities.join(", ") : "Not specified",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="leading-relaxed whitespace-pre-line">{request.description}</p>
      <dl className="grid gap-4 rounded-xl bg-muted/60 p-4 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex gap-3">
            <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{f.icon}</span>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{f.label}</dt>
              <dd className="text-sm font-medium">{f.value}</dd>
            </div>
          </div>
        ))}
        {request.availability && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Availability</dt>
            <dd className="text-sm font-medium">{request.availability}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-muted-foreground">Posted {formatDate(request.createdAt)}</p>
    </div>
  );
}
