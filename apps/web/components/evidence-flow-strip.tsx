type EvidenceFlowStep = {
  label: string;
  detail?: string;
};

export function EvidenceFlowStrip({
  steps,
  label,
}: {
  steps: EvidenceFlowStep[];
  label: string;
}) {
  return (
    <ol className="evidence-flow-strip" aria-label={label}>
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`}>
          <span className="evidence-flow-marker" aria-hidden="true">{index + 1}</span>
          <div>
            <small>{step.label}</small>
            {step.detail && <strong>{step.detail}</strong>}
          </div>
        </li>
      ))}
    </ol>
  );
}
