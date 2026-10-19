import { Resend } from "resend";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Emails captured instead of sent while running tests. */
export const testOutbox: OutgoingEmail[] = [];

let resend: Resend | null = null;

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    testOutbox.push(email);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No email provider configured (local dev): print so links can be clicked from the terminal.
    console.info(`\n[email] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return;
  }

  resend ??= new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Match Mentor <onboarding@resend.dev>",
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Failed to send email to ${email.to}: ${error.message}`);
}
