import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null);

/** "MIT, Harvard\nYale" → ["MIT", "Harvard", "Yale"] */
export const listField = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
    return [...new Set(raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];
  })
  .pipe(
    z
      .array(z.string().max(80, "Each university name must be under 80 characters."))
      .max(10, "List at most 10 universities."),
  );

const topicIds = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean));

export const studentProfileSchema = z.object({
  bio: optionalText(500),
  targetUniversities: listField,
  availability: optionalText(200),
  topicIds,
});
export type StudentProfileInput = z.input<typeof studentProfileSchema>;

export const mentorProfileSchema = z.object({
  university: z.string().trim().min(2, "Tell students where you study.").max(120),
  bio: z
    .string()
    .trim()
    .min(20, "Write at least a sentence or two about how you can help.")
    .max(600, "Keep this under 600 characters."),
  availability: optionalText(200),
  capacity: z.coerce
    .number({ message: "Enter a number." })
    .int()
    .min(1, "Take at least 1 student.")
    .max(10, "10 students at once is the maximum."),
  topicIds: topicIds.pipe(z.array(z.string()).min(1, "Pick at least one topic you can help with.")),
});
export type MentorProfileInput = z.input<typeof mentorProfileSchema>;

const displayName = z.string().trim().min(2, "Enter your name.").max(80, "Keep your name under 80 characters.");

export const onboardingSchema = z.discriminatedUnion("path", [
  studentProfileSchema.extend({ path: z.literal("student"), name: displayName }),
  mentorProfileSchema.extend({ path: z.literal("mentor"), name: displayName }),
]);
export type OnboardingInput = z.input<typeof onboardingSchema>;

/** Today's date (UTC) at midnight, so a deadline of "today" is still allowed. */
function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const requestSchema = z.object({
  topicId: z.string().min(1, "Choose a topic."),
  title: z.string().trim().min(5, "Give your request a short title.").max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Describe what you need help with in a sentence or two.")
    .max(2000, "Keep this under 2000 characters."),
  targetUniversities: listField,
  deadline: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const date = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date." });
        return z.NEVER;
      }
      if (date < startOfToday()) {
        ctx.addIssue({ code: "custom", message: "The deadline can't be in the past." });
        return z.NEVER;
      }
      return date;
    }),
  urgency: z.enum(["low", "normal", "high"], { message: "Choose how urgent this is." }).default("normal"),
  format: z.enum(["chat", "call", "in_person"], { message: "Choose how you'd like to meet." }).default("chat"),
  availability: optionalText(200),
});
export type RequestInput = z.input<typeof requestSchema>;

export const responseSchema = z.object({
  kind: z.enum(["interested", "passed"]),
  note: optionalText(500),
});
export type ResponseInput = z.input<typeof responseSchema>;

export const mentorReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export const cancelMatchSchema = z.object({
  reopen: z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean()),
  reason: optionalText(300),
});

export const feedbackSchema = z.object({
  rating: z.coerce
    .number({ message: "Choose a rating." })
    .int()
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  comment: optionalText(1000),
});
export type FeedbackInput = z.input<typeof feedbackSchema>;

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: z.enum(["student", "mentor", "organizer", "admin"], { message: "Choose a role." }),
});
export type InviteInput = z.input<typeof inviteSchema>;

export const roleChangeSchema = z.object({
  role: z.enum(["student", "mentor", "organizer", "admin"], { message: "Choose a role." }),
});
