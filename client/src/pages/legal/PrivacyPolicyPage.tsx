import { LegalLayout, LegalSection } from "./LegalLayout";

/**
 * DRAFT starting point, written to reflect what THIS app's code actually
 * collects (see src/types/*.ts) — not generic boilerplate. Still requires
 * real legal review before use with real users, particularly for Kenya's
 * Data Protection Act, 2019 compliance (registration with the Office of
 * the Data Protection Commissioner may be required depending on the
 * volume/nature of processing — a lawyer should confirm this).
 */
export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="Draft — not yet published"
      draftNotice="This text is a starting draft reflecting what the Reflex app collects today. It has not been reviewed by a lawyer and must not be published or relied upon until it has."
    >
      <LegalSection title="1. Who this applies to">
        <p>
          This policy applies to Retailers, Dispatchers, Riders, and their customers who use the
          Reflex Logistics platform ("Reflex," "we," "us"). By creating an account or using Reflex,
          you agree to the collection and use of information as described here.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>Depending on your role, we collect:</p>
        <ul className="list-disc pl-5">
          <li><strong>Account information:</strong> name, phone number, email, password (stored hashed, never in plain text), and your role (Retailer, Dispatcher, or Rider).</li>
          <li><strong>Business information (Retailers):</strong> business name.</li>
          <li><strong>Delivery information:</strong> customer name, phone number, and delivery address; item description, quantity, category, approximate weight, fragility/perishability flags, declared value, and any special instructions you provide.</li>
          <li><strong>Location information (Riders):</strong> location data used to show delivery progress on the map and coordinate assignments while you are actively working. <em>[OPEN QUESTION for legal/product review: does this include background location tracking when the app is not in active use? The current build only reads location while a delivery screen is open — confirm and update this section to match actual behavior before publishing.]</em></li>
          <li><strong>Delivery proof:</strong> a confirmation code, and depending on what mechanism is ultimately built, potentially a signature or photo (see docs/api-contract.md — this is not finalized).</li>
          <li><strong>Payment information:</strong> payment status and a transaction reference for a delivery. <em>[OPEN QUESTION: if M-Pesa or another provider is integrated, this section must be updated to name the provider and describe what it shares with us.]</em></li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use this information">
        <ul className="list-disc pl-5">
          <li>To create and operate your account.</li>
          <li>To coordinate deliveries between Retailers, Dispatchers, and Riders.</li>
          <li>To show delivery status and location to the relevant parties.</li>
          <li>To process payments where applicable.</li>
          <li>To respond to support requests and investigate incidents.</li>
          <li>To meet legal obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <p>
          Delivery-related information is shared only with the parties involved in that specific
          delivery (the assigned Rider sees the customer's address and contact details necessary to
          complete the delivery; the Retailer sees delivery status). We do not sell personal
          information. <em>[OPEN QUESTION: name any third-party processors here once selected —
          e.g. a map provider, payment provider, or SMS gateway — and what data each receives.]</em>
        </p>
      </LegalSection>

      <LegalSection title="5. Your rights">
        <p>
          Under Kenya's Data Protection Act, 2019, you have the right to access, correct, or request
          deletion of your personal data, and to object to certain processing. To exercise these
          rights, contact us at <em>[support contact — to be added]</em>.
        </p>
      </LegalSection>

      <LegalSection title="6. Data retention">
        <p>
          <em>[TO BE DEFINED: how long delivery records, location history, and account data are kept
          after an account is closed or a delivery is completed. This needs a decision from the
          team, not a default assumption.]</em>
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We take reasonable technical and organizational measures to protect your information. No
          system is completely secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be communicated to
          users before they take effect.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p><em>[Company legal name, physical/registered address, and contact email — to be added before publishing.]</em></p>
      </LegalSection>
    </LegalLayout>
  );
}
