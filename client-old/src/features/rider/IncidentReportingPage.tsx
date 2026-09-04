import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Select, Input, Alert, Card } from "@/components";
import { riderService } from "@/services/riderService";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import { useToastStore } from "@/components/Toast";
import type { IncidentType } from "@/types";

const INCIDENT_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: "CUSTOMER_UNREACHABLE", label: "Customer unreachable" },
  { value: "ADDRESS_NOT_FOUND", label: "Address not found" },
  { value: "ITEM_DAMAGED", label: "Item damaged" },
  { value: "VEHICLE_ISSUE", label: "Vehicle issue" },
  { value: "SAFETY_CONCERN", label: "Safety concern" },
  { value: "OTHER", label: "Other" },
];

export function IncidentReportingPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const [type, setType] = useState<IncidentType>("CUSTOMER_UNREACHABLE");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!deliveryId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await riderService.reportIncident(deliveryId, { type, notes: notes || undefined });
      pushToast("success", "Incident reported.");
      navigate(`/rider/deliveries/${deliveryId}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? API_ERROR_MESSAGES[err.category] : "Couldn't report the incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-section-title text-foreground">Report an issue</h1>
      <Card className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Select
          label="Issue type"
          value={type}
          onChange={(e) => setType(e.target.value as IncidentType)}
          options={INCIDENT_OPTIONS}
        />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button isLoading={isSubmitting} onClick={handleSubmit}>
          Submit report
        </Button>
      </Card>
    </div>
  );
}
