import { LegalLayout, LegalSection } from "./LegalLayout";

export function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="Draft — not yet published"
      draftNotice="This text is a starting draft. It has not been reviewed by a lawyer and must not be published or relied upon until it has."
    >
      <LegalSection title="1. Acceptance of terms">
        <p>
          By creating an account or using Reflex Logistics ("Reflex," "we," "us"), you agree to
          these Terms of Service. If you are creating an account on behalf of a business, you
          confirm you have authority to bind that business to these terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and roles">
        <p>
          Reflex offers accounts for Retailers, Dispatchers, and Riders. Dispatcher and Rider
          accounts join an existing organization via an invite code and are subject to that
          organization's internal arrangements with you in addition to these Terms. You are
          responsible for keeping your account credentials confidential and for all activity under
          your account.
        </p>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>Use Reflex for unlawful goods or purposes.</li>
          <li>Provide false information about a delivery, customer, or yourself.</li>
          <li>Attempt to access another user's account or another tenant's data.</li>
          <li>Interfere with or disrupt the platform's operation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Retailer terms">
        <p>
          Retailers are responsible for the accuracy of delivery information they submit (item
          description, declared value, customer contact details) and for any fees associated with
          using the platform. <em>[OPEN QUESTION: fee structure, billing cycle, and what happens on
          a disputed or failed delivery — to be defined by the business team, not assumed here.]</em>
        </p>
      </LegalSection>

      <LegalSection title="5. Dispatcher and Rider terms">
        <p>
          Dispatchers and Riders agree to handle deliveries and customer information professionally
          and in accordance with any additional agreement with their organization.
        </p>
        <p>
          <strong>
            The specific terms governing Riders — including whether Riders are independent
            contractors or another classification, compensation, liability for lost, damaged, or
            delayed goods, and liability for injury or accidents while making a delivery — are set
            out separately in the Rider Agreement, not here.
          </strong>{" "}
          That document requires dedicated legal review specific to Kenyan labor and liability law
          and should not be treated as settled by anything in this file.
        </p>
      </LegalSection>

      <LegalSection title="6. Platform role and limitation of liability">
        <p>
          Reflex provides a coordination platform connecting Retailers, Dispatchers, and Riders. 
          <em>
            {" "}[OPEN QUESTION FOR LEGAL REVIEW: does Reflex act purely as a technology intermediary
            (not a party to the delivery itself), or does it assume some responsibility for delivery
            outcomes? This single decision drives most of the platform's liability exposure and
            should be resolved deliberately with legal counsel, not left to whatever this draft
            happens to say.]
          </em>
        </p>
        <p>
          <em>
            [Standard limitation-of-liability, disclaimer-of-warranties, and indemnification clauses
            would normally go here. They are intentionally omitted rather than drafted generically,
            since their wording has direct financial consequences and should come from a lawyer
            familiar with Kenyan contract law, not a template.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          We may suspend or terminate an account that violates these terms. You may stop using
          Reflex at any time.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing law">
        <p><em>[To be confirmed with legal counsel — expected to be the laws of Kenya.]</em></p>
      </LegalSection>

      <LegalSection title="9. Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use of Reflex after changes take
          effect constitutes acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p><em>[Company legal name, physical/registered address, and contact email — to be added before publishing.]</em></p>
      </LegalSection>
    </LegalLayout>
  );
}
