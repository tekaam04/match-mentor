/** Default help categories, mirroring the community's existing chat channels. Seeded into the Topic table. */
export const DEFAULT_TOPICS = [
  { slug: "english-tests", label: "English proficiency tests (IELTS / TOEFL / Duolingo)" },
  { slug: "sat", label: "SAT" },
  { slug: "essays", label: "Essays" },
  { slug: "recommendation-letters", label: "Letters of recommendation" },
  { slug: "financial-aid", label: "Financial aid & scholarships" },
  { slug: "interviews", label: "Admission & scholarship interviews" },
  { slug: "universities-outside-us", label: "Universities outside the US" },
  { slug: "visa-travel", label: "Visa & travel" },
  { slug: "gap-year", label: "Gap year" },
  { slug: "general", label: "General / other" },
] as const;
