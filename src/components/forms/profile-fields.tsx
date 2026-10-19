import { CheckboxPills, TextAreaField, TextField } from "./fields";

export type TopicOption = { id: string; label: string };
type FieldErrorFn = (name: string) => string | undefined;

export type StudentProfileDefaults = {
  bio?: string | null;
  targetUniversities?: string[];
  availability?: string | null;
  topicIds?: string[];
};

export function StudentProfileFields({
  topics,
  defaults = {},
  fieldError,
}: {
  topics: TopicOption[];
  defaults?: StudentProfileDefaults;
  fieldError: FieldErrorFn;
}) {
  return (
    <>
      <TextField
        name="targetUniversities"
        label="Universities you're applying to"
        placeholder="MIT, University of Toronto, Yale"
        hint="Separate with commas. Up to 10."
        optional
        defaultValue={defaults.targetUniversities?.join(", ")}
        error={fieldError("targetUniversities")}
      />
      <CheckboxPills
        name="topicIds"
        label="What would you like help with?"
        hint="Mentors who know these topics will see your requests first."
        optional
        options={topics.map((t) => ({ value: t.id, label: t.label }))}
        defaultValues={defaults.topicIds}
        error={fieldError("topicIds")}
      />
      <TextAreaField
        name="bio"
        label="About you"
        placeholder="Where you're from, what you want to study, where you are in the process…"
        optional
        maxLength={500}
        defaultValue={defaults.bio}
        error={fieldError("bio")}
      />
      <TextField
        name="availability"
        label="When are you usually free?"
        placeholder="Weekday evenings (EAT), Saturday mornings"
        optional
        defaultValue={defaults.availability}
        error={fieldError("availability")}
      />
    </>
  );
}

export type MentorProfileDefaults = {
  university?: string | null;
  bio?: string | null;
  availability?: string | null;
  capacity?: number;
  topicIds?: string[];
};

export function MentorProfileFields({
  topics,
  defaults = {},
  fieldError,
}: {
  topics: TopicOption[];
  defaults?: MentorProfileDefaults;
  fieldError: FieldErrorFn;
}) {
  return (
    <>
      <TextField
        name="university"
        label="Where do you study (or did you study)?"
        placeholder="MIT"
        required
        defaultValue={defaults.university}
        error={fieldError("university")}
      />
      <CheckboxPills
        name="topicIds"
        label="Topics you can help with"
        hint="You'll see requests in these topics first."
        options={topics.map((t) => ({ value: t.id, label: t.label }))}
        defaultValues={defaults.topicIds}
        error={fieldError("topicIds")}
      />
      <TextAreaField
        name="bio"
        label="How you can help"
        placeholder="Your background, what you went through when applying, and what you're good at helping with."
        required
        maxLength={600}
        defaultValue={defaults.bio}
        error={fieldError("bio")}
      />
      <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
        <TextField
          name="capacity"
          label="Students at once"
          type="number"
          min={1}
          max={10}
          required
          defaultValue={defaults.capacity ?? 3}
          error={fieldError("capacity")}
        />
        <TextField
          name="availability"
          label="When are you usually free?"
          placeholder="Weekends, Tuesday evenings (EST)"
          optional
          defaultValue={defaults.availability}
          error={fieldError("availability")}
        />
      </div>
    </>
  );
}
