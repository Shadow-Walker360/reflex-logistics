import { LegalLayout, LegalSection } from "./LegalLayout";

/**
 * Separate from the general Terms of Service because Retailer-specific
 * commercial terms (fees, billing, dispute handling) don't belong mixed
 * into the platform-wide terms every role agrees to. Still a draft — see
 * LegalLayout's draftNotice.
 */
export function RetailerAgreementPage() {
  return (
    <LegalLayout
      title="Retailer Agreement"
      lastUpdated="Draft — not yet published"
      draftNotice="This document has not been reviewed by a lawyer or finalized by the business team. Fee structure and dispute-handling sections are placeholders."
    >
      <LegalSection title="1. Purpose">
        <p>
          This Retailer Agreement supplements the general Terms of Service and governs your use of
          Reflex Logistics to create and track deliveries as a Retailer.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          Creating a Retailer account establishes a new organization ("tenant") on Reflex. You are
          responsible for the accuracy of the business information you provide and for managing
          which Dispatchers and Riders are invited to join your organization.
        </p>
      </LegalSection>

      <LegalSection title="3. Delivery requests">
        <p>
          You are responsible for the accuracy of information submitted with each delivery request:
          customer contact details, item description, declared value, fragility/perishability
          flags, and any special instructions. Inaccurate information may result in delivery delays
          or failures that Reflex is not responsible for.
        </p>
      </LegalSection>

      <LegalSection title="4. Fees and billing — NOT YET DEFINED">
        <p>
          <em>
            [Whether Reflex charges a per-delivery fee, subscription, commission, or another
            structure; billing cycle and payment method; what happens on a failed or cancelled
            delivery. This is a business decision that has not been made yet and should not be
            assumed by this document.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="5. Payments to customers/COD handling — NOT YET DEFINED">
        <p>
          <em>
            [Where cash-on-delivery is used, how and when collected funds are reconciled and
            transferred to the Retailer — depends on the payment rail decision noted in
            docs/api-contract.md, which has not been made.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="6. Disputes over delivery outcomes">
        <p>
          <em>
            [Process for disputing a failed, delayed, or damaged delivery, and how liability is
            allocated between Retailer, Rider, and Reflex in each case — to be defined together
            with the liability sections of the Terms of Service and Rider Agreement, not in
            isolation.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          Either party may terminate this agreement in accordance with the general Terms of
          Service. <em>[Any Retailer-specific notice period or data-export process on termination — to be defined.]</em>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
