import { LegalLayout, LegalSection } from "./LegalLayout";

/**
 * This document carries the most real liability exposure of any legal
 * page in this app (contractor classification, injury liability, lost/
 * damaged goods liability). The sections below that touch those topics
 * are deliberately left as flagged open questions rather than filled in
 * with plausible-sounding boilerplate — getting rider classification or
 * liability allocation wrong has direct financial and legal consequences,
 * and that judgment call belongs to a lawyer who knows Kenyan labor and
 * liability law, not to text generated here.
 */
export function RiderAgreementPage() {
  return (
    <LegalLayout
      title="Rider Agreement"
      lastUpdated="Draft — not yet published"
      draftNotice="This document is INCOMPLETE BY DESIGN. Its most consequential sections (classification, compensation, liability, insurance) are left as open questions for legal counsel rather than filled in — do not publish or ask a rider to sign this until those sections are actually written by a lawyer."
    >
      <LegalSection title="1. Purpose">
        <p>
          This Rider Agreement governs your relationship with Reflex Logistics and/or the
          organization you joined via an invite code when carrying out deliveries through the
          Reflex platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Your relationship with Reflex — NOT YET DEFINED">
        <p>
          <strong>
            [CRITICAL OPEN QUESTION — REQUIRES LEGAL REVIEW BEFORE PUBLISHING:]
          </strong>{" "}
          Are Riders independent contractors, employees of the organization they joined, or some
          other classification under Kenyan labor law? This determines minimum wage obligations,
          leave entitlements, tax withholding, and much of the liability discussion below. This
          draft takes no position on it, because doing so without legal input risks misclassifying
          workers — a mistake with real financial and legal consequences for whoever operates
          Reflex.
        </p>
      </LegalSection>

      <LegalSection title="3. Compensation — NOT YET DEFINED">
        <p>
          <em>
            [How and when Riders are paid, whether per-delivery or otherwise, and how disputes over
            pay are resolved — to be defined by the business team together with legal counsel.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="4. Liability for goods">
        <p>
          <em>
            [Who bears responsibility if an item is lost, damaged, or stolen while in a Rider's
            custody — the Rider, the Retailer, Reflex, or some shared arrangement (e.g. tied to
            the item's declared value and whether it was handled per instructions)? This needs a
            deliberate policy decision, not a default assumption.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="5. Liability for injury and accidents">
        <p>
          <strong>[CRITICAL OPEN QUESTION — REQUIRES LEGAL REVIEW:]</strong>{" "}
          <em>
            Who is responsible if a Rider is injured, or causes injury or property damage to a
            third party, while making a delivery — including questions of vehicle insurance,
            whether Reflex or the organization carries any coverage for Riders, and how this
            interacts with the classification question in Section 2. This is the single highest-
            risk section of this entire app's legal surface and must not be filled in generically.
          </em>
        </p>
      </LegalSection>

      <LegalSection title="6. Vehicle and equipment">
        <p>
          <em>
            [Whether Riders must use their own vehicle, who is responsible for maintenance/fuel,
            and any equipment requirements — to be defined.]
          </em>
        </p>
      </LegalSection>

      <LegalSection title="7. Conduct expectations">
        <ul className="list-disc pl-5">
          <li>Handle customer information and goods professionally and securely.</li>
          <li>Report incidents (damaged items, safety concerns, inability to complete a delivery) through the app promptly.</li>
          <li>Do not share delivery or customer information outside the scope of completing the delivery.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Termination of this agreement">
        <p><em>[Notice period and grounds for termination by either party — to be defined.]</em></p>
      </LegalSection>

      <LegalSection title="9. Governing law and dispute resolution">
        <p><em>[To be confirmed with legal counsel — expected to be the laws of Kenya.]</em></p>
      </LegalSection>
    </LegalLayout>
  );
}
