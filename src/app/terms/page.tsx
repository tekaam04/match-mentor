import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        {SITE.name} is a free, volunteer-run community service that connects people applying to university with student
        mentors. By using it, you agree to these terms.
      </p>

      <h2>Using the service</h2>
      <ul>
        <li>Give accurate information about yourself, and use your own account only.</li>
        <li>Treat everyone with respect. No harassment, discrimination, spam or requests for payment.</li>
        <li>Only use another person’s contact details to talk about the mentorship you’ve been matched for.</li>
        <li>Don’t share other people’s private information, essays or documents without their permission.</li>
      </ul>

      <h2>Mentors</h2>
      <ul>
        <li>Mentoring is voluntary and unpaid. Help only with what you know, and say so when you don’t know.</li>
        <li>Never write essays or complete applications on a student’s behalf. Guide and give feedback instead.</li>
        <li>Never ask a student for money, gifts or personal favors.</li>
      </ul>

      <h2>Advice, not guarantees</h2>
      <p>
        Mentors are students sharing their own experience. Their advice isn’t professional, legal or immigration advice,
        and nobody can guarantee an admission, scholarship or visa outcome. Always check important details, such as
        deadlines, test requirements and visa rules, with the official university or government source.
      </p>

      <h2>Organizers</h2>
      <p>
        Community organizers approve mentors, make matches, and may end matches or suspend accounts that break these
        terms or put others at risk.
      </p>

      <h2>Availability</h2>
      <p>
        We run the service on a volunteer basis and may change or stop it at any time. It’s provided “as is”, without
        warranties of any kind.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or concerns? Email{" "}
        <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {SITE.contactEmail}
        </a>
        . See also our{" "}
        <a href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
          privacy policy
        </a>
        .
      </p>
    </LegalPage>
  );
}
