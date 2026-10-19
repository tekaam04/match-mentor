import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";
import { adminEmails } from "../src/lib/admin-emails";
import { DEFAULT_TOPICS } from "../src/lib/topics";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Demo accounts are only created outside production. Sign in as any of them locally with the
// magic-link form; the link is printed in the dev server terminal.
const SEED_DEMO = process.env.NODE_ENV !== "production" && process.env.SEED_DEMO !== "false";

async function upsertUser(email: string, name: string, role: Role, onboarded = true) {
  const onboardedAt = onboarded ? new Date() : null;
  return db.user.upsert({
    where: { email },
    update: { role, onboardedAt },
    create: { id: randomUUID(), email, name, role, emailVerified: true, onboardedAt },
  });
}

async function seedTopics() {
  for (const [i, t] of DEFAULT_TOPICS.entries()) {
    await db.topic.upsert({
      where: { slug: t.slug },
      update: { label: t.label, sortOrder: i },
      create: { slug: t.slug, label: t.label, sortOrder: i },
    });
  }
  return db.topic.findMany();
}

async function seedAdmins() {
  for (const email of adminEmails()) {
    await upsertUser(email, email.split("@")[0], "admin");
  }
}

async function seedDemo(topics: { id: string; slug: string }[]) {
  const topic = (slug: string) => {
    const t = topics.find((x) => x.slug === slug);
    if (!t) throw new Error(`Unknown topic ${slug}`);
    return t;
  };

  const organizer = await upsertUser("organizer@example.com", "Olivia Organizer", "organizer");

  const mentors = [
    { email: "mentor1@example.com", name: "Meron Mentor", university: "MIT", topics: ["essays", "sat", "interviews"] },
    { email: "mentor2@example.com", name: "Dawit Mentor", university: "Stanford", topics: ["financial-aid", "visa-travel"] },
    { email: "mentor3@example.com", name: "Hana Mentor", university: "University of Toronto", topics: ["universities-outside-us", "english-tests", "gap-year"] },
    { email: "mentor4@example.com", name: "Kidus Applicant-Mentor", university: "Yale", topics: ["essays", "recommendation-letters"], status: "pending" as const },
  ];
  for (const m of mentors) {
    const user = await upsertUser(m.email, m.name, "mentor");
    const connect = m.topics.map((s) => ({ id: topic(s).id }));
    const status = m.status ?? "approved";
    const bio = `Current student at ${m.university}. I went through the same application process and I'm happy to help.`;
    await db.mentorProfile.upsert({
      where: { userId: user.id },
      update: { university: m.university, bio, status, topics: { set: connect } },
      create: { userId: user.id, university: m.university, bio, capacity: 3, status, topics: { connect } },
    });
  }

  const students = [
    { email: "student1@example.com", name: "Selam Student", targets: ["MIT", "Harvard"] },
    { email: "student2@example.com", name: "Yonas Student", targets: ["University of Toronto"] },
    { email: "student3@example.com", name: "Liya Student", targets: ["Stanford", "Yale"] },
  ];
  const studentUsers = [];
  for (const s of students) {
    const user = await upsertUser(s.email, s.name, "student");
    await db.studentProfile.upsert({
      where: { userId: user.id },
      update: { targetUniversities: s.targets },
      create: { userId: user.id, targetUniversities: s.targets },
    });
    studentUsers.push(user);
  }

  // Requests are recreated each run so the demo state is predictable.
  await db.mentorshipRequest.deleteMany({ where: { studentId: { in: studentUsers.map((u) => u.id) } } });
  const [selam, yonas, liya] = studentUsers;
  const mentor1 = await db.user.findUniqueOrThrow({ where: { email: "mentor1@example.com" } });
  const mentor2 = await db.user.findUniqueOrThrow({ where: { email: "mentor2@example.com" } });

  await db.mentorshipRequest.create({
    data: {
      studentId: selam.id,
      topicId: topic("essays").id,
      title: "Feedback on my Common App personal essay",
      description: "I have a second draft about growing up helping in my family's shop and want feedback on structure.",
      targetUniversities: ["MIT", "Harvard"],
      deadline: new Date("2026-11-01"),
      urgency: "high",
      format: "call",
      responses: {
        create: { mentorId: mentor1.id, kind: "interested", note: "Happy to help — I wrote about something similar." },
      },
    },
  });
  await db.mentorshipRequest.create({
    data: {
      studentId: yonas.id,
      topicId: topic("visa-travel").id,
      title: "Study permit timeline for Canada",
      description: "When should I start the study permit application if I get an offer in March?",
      targetUniversities: ["University of Toronto"],
      urgency: "normal",
      format: "chat",
    },
  });
  await db.mentorshipRequest.create({
    data: {
      studentId: selam.id,
      topicId: topic("sat").id,
      title: "SAT study plan with 8 weeks left",
      description: "My practice scores are around 1350. I want a weekly plan to get to 1500 before the December test.",
      targetUniversities: ["MIT"],
      deadline: new Date("2026-12-05"),
      urgency: "normal",
      format: "chat",
    },
  });
  await db.mentorshipRequest.create({
    data: {
      studentId: liya.id,
      topicId: topic("interviews").id,
      title: "Mock interview for a scholarship",
      description: "I have an interview for a full scholarship next week and would love to practise common questions.",
      targetUniversities: ["Yale"],
      deadline: new Date("2026-10-30"),
      urgency: "high",
      format: "call",
    },
  });
  await db.mentorshipRequest.create({
    data: {
      studentId: yonas.id,
      topicId: topic("english-tests").id,
      title: "IELTS vs Duolingo English Test",
      description: "Which test is accepted more widely in Canada, and how long should I prepare for each?",
      targetUniversities: ["University of Toronto", "McGill"],
      urgency: "low",
      format: "chat",
    },
  });
  await db.mentorshipRequest.create({
    data: {
      studentId: liya.id,
      topicId: topic("financial-aid").id,
      title: "Filling out the CSS Profile as an international student",
      description: "Not sure how to report income from my parents' small business.",
      targetUniversities: ["Stanford", "Yale"],
      urgency: "normal",
      format: "call",
      status: "matched",
      match: {
        create: {
          mentorId: mentor2.id,
          organizerId: organizer.id,
          events: { create: { type: "created", actorId: organizer.id } },
        },
      },
    },
  });
}

async function main() {
  const topics = await seedTopics();
  await seedAdmins();
  if (SEED_DEMO) await seedDemo(topics);
  console.info(`Seeded ${topics.length} topics, ${adminEmails().length} admins${SEED_DEMO ? ", demo data" : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
