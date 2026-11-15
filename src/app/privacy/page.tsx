import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        {SITE.name} is a free, volunteer-run service that connects people applying to university with student mentors.
        This page explains what information we collect, why, and what you can do about it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name and email address. If you sign in with Google, we also receive
          your Google profile picture. We never see your Google password.
        </li>
        <li>
          <strong>Profile information you choose to add:</strong> for example the universities you’re applying to,
          topics you need help with, your availability and a short bio. Mentors also add where they study and how
          many students they can help.
        </li>
        <li>
          <strong>Requests, responses and matches:</strong> what you ask for help with, mentors’ offers to help, who
          you’re matched with, and the status of each match.
        </li>
        <li>
          <strong>Feedback:</strong> the rating and comment students leave after a match.
        </li>
        <li>
          <strong>Technical information:</strong> sign-in sessions (including IP address and browser type) to keep your
          account secure, and basic server logs from our hosting provider.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: show requests to mentors, let organizers make matches, and send you emails about your account and matches.</li>
        <li>To keep the service safe, for example approving mentors and preventing misuse.</li>
        <li>To understand how well matching works, using totals such as how many matches were completed.</li>
      </ul>
      <p>We don’t sell your information, show ads, or use it for anything unrelated to mentoring.</p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Mentors</strong> can see open requests, including the student’s first name, request details and target
          universities.
        </li>
        <li>
          <strong>Once you’re matched</strong>, you and your mentor or student can see each other’s name and email so
          you can get in touch.
        </li>
        <li>
          <strong>Community organizers</strong> can see all accounts, requests, matches and feedback so they can make and
          support matches.
        </li>
      </ul>

      <h2>Services we use</h2>
      <p>
        We rely on a few providers to run the site: Vercel (hosting), Neon (database), Resend (sending email) and
        Google (optional sign-in). They process data on our behalf only to provide their service.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and activity while the service is running or until you ask us to delete it. Sign-in links
        expire after 15 minutes and old sessions expire automatically.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can edit your profile at any time from the Profile page.</li>
        <li>
          You can ask us to see, correct or delete your information by emailing{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {SITE.contactEmail}
          </a>
          . We’ll respond within 30 days.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        The service is meant for students applying to university, who are usually 16 or older. If you’re younger than
        the age required to use online services where you live, please use it with a parent or guardian’s permission.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy, we’ll update the date at the top of this page.</p>
    </LegalPage>
  );
}
