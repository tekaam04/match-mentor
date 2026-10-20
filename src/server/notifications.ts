import { sendEmail } from "@/lib/email";

type Person = { name: string; email: string };

const appUrl = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const firstName = (p: Person) => p.name.trim().split(/\s+/)[0] || "there";

/** One consistent, plain email layout: greeting, paragraphs, one button. */
function compose(opts: { to: Person; subject: string; paragraphs: string[]; cta: { label: string; path: string } }) {
  const url = `${appUrl()}${opts.cta.path}`;
  const greeting = `Hi ${firstName(opts.to)},`;
  const text = [greeting, ...opts.paragraphs, `${opts.cta.label}: ${url}`, "— Match Mentor"].join("\n\n");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;color:#1e1b3a;line-height:1.5">
<p>${escapeHtml(greeting)}</p>
${opts.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<p><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(opts.cta.label)}</a></p>
<p style="color:#6b6880;font-size:13px">— Match Mentor</p>
</div>`;
  return { to: opts.to.email, subject: opts.subject, text, html };
}

/** Email failures are logged, never thrown: a match must not fail because an inbox bounced. */
async function deliver(emails: ReturnType<typeof compose>[]) {
  const results = await Promise.allSettled(emails.map((e) => sendEmail(e)));
  for (const r of results) if (r.status === "rejected") console.error("[email] send failed:", r.reason);
}

type MatchInfo = { matchId: string; requestTitle: string; student: Person; mentor: Person };

export function notifyMatched({ matchId, requestTitle, student, mentor }: MatchInfo) {
  const path = `/matches/${matchId}`;
  return deliver([
    compose({
      to: student,
      subject: `You're matched with ${mentor.name} on Match Mentor`,
      paragraphs: [
        `Good news: ${mentor.name} will help you with "${requestTitle}".`,
        `You can reach them at ${mentor.email}. They'll also reach out to you to plan a first conversation.`,
      ],
      cta: { label: "View your match", path },
    }),
    compose({
      to: mentor,
      subject: `New match: ${student.name} — "${requestTitle}"`,
      paragraphs: [
        `Thank you for helping! You've been matched with ${student.name} for "${requestTitle}".`,
        `Please reach out to them at ${student.email} within the next two days to plan a first conversation.`,
      ],
      cta: { label: "Open the match", path },
    }),
  ]);
}

export function notifyReassigned(info: MatchInfo & { previousMentor: Person }) {
  const path = `/matches/${info.matchId}`;
  return deliver([
    compose({
      to: info.student,
      subject: `Your mentor for "${info.requestTitle}" has changed`,
      paragraphs: [
        `${info.mentor.name} will now help you with "${info.requestTitle}".`,
        `You can reach them at ${info.mentor.email}.`,
      ],
      cta: { label: "View your match", path },
    }),
    compose({
      to: info.mentor,
      subject: `New match: ${info.student.name} — "${info.requestTitle}"`,
      paragraphs: [
        `You've been matched with ${info.student.name} for "${info.requestTitle}".`,
        `Please reach out to them at ${info.student.email} within the next two days.`,
      ],
      cta: { label: "Open the match", path },
    }),
    compose({
      to: info.previousMentor,
      subject: `Match update: "${info.requestTitle}"`,
      paragraphs: [`An organizer has moved "${info.requestTitle}" to another mentor. Thank you for your time!`],
      cta: { label: "See open requests", path: "/mentor" },
    }),
  ]);
}

export function notifyCompleted({ matchId, requestTitle, student }: Omit<MatchInfo, "mentor">) {
  return deliver([
    compose({
      to: student,
      subject: `How did it go? "${requestTitle}"`,
      paragraphs: [
        `Your match for "${requestTitle}" is marked complete.`,
        "It takes 30 seconds to tell us how it went, and it helps us match future students well.",
      ],
      cta: { label: "Leave feedback", path: `/matches/${matchId}` },
    }),
  ]);
}

export function notifyMentorReviewed(mentor: Person, decision: "approved" | "rejected") {
  return deliver([
    decision === "approved"
      ? compose({
          to: mentor,
          subject: "You're approved as a Match Mentor mentor",
          paragraphs: ["Welcome aboard! You can now see open requests and offer to help students."],
          cta: { label: "See open requests", path: "/mentor" },
        })
      : compose({
          to: mentor,
          subject: "About your Match Mentor mentor application",
          paragraphs: [
            "Thanks for offering to mentor. An organizer wasn't able to approve your profile right now.",
            "If you think this is a mistake, reply in the community group and an organizer will help.",
          ],
          cta: { label: "Review your profile", path: "/mentor/profile" },
        }),
  ]);
}

const ROLE_PHRASE = { student: "a student", mentor: "a mentor", organizer: "an organizer", admin: "an admin" } as const;

export function notifyInvited(email: string, role: keyof typeof ROLE_PHRASE, inviterName: string) {
  return deliver([
    compose({
      to: { name: "", email },
      subject: `${inviterName} invited you to Match Mentor`,
      paragraphs: [
        `${inviterName} invited you to join Match Mentor as ${ROLE_PHRASE[role]}.`,
        role === "mentor"
          ? "You're pre-approved: sign in with this email address, fill in your mentor profile, and you can start helping students right away."
          : "Sign in with this email address to get started. The invitation is valid for 14 days.",
      ],
      cta: { label: "Accept invitation", path: "/sign-in" },
    }),
  ]);
}
