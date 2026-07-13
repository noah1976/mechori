import type {
  CandidateStatus,
  FieldAssertion,
  ImportSessionStatus,
} from "./domain-model.ts";

const importTransitions: Record<ImportSessionStatus, readonly ImportSessionStatus[]> = {
  created: ["extracting", "discarded", "failed"],
  extracting: ["extracted", "partially_failed", "failed", "discarded"],
  extracted: ["structuring", "awaiting_review", "discarded", "failed"],
  structuring: ["awaiting_review", "partially_failed", "failed", "discarded"],
  awaiting_review: ["confirmed", "discarded"],
  confirmed: ["persisted", "awaiting_review", "discarded"],
  persisted: [],
  partially_failed: ["extracting", "structuring", "awaiting_review", "discarded", "failed"],
  failed: ["extracting", "discarded"],
  discarded: [],
};

export function canTransitionImportSession(
  current: ImportSessionStatus,
  next: ImportSessionStatus,
): boolean {
  return importTransitions[current].includes(next);
}

export function transitionImportSession(
  current: ImportSessionStatus,
  next: ImportSessionStatus,
): ImportSessionStatus {
  if (!canTransitionImportSession(current, next)) {
    throw new Error(`invalid_import_transition:${current}:${next}`);
  }

  return next;
}

export function requiresFieldReview(assertion: FieldAssertion): boolean {
  return (
    assertion.verificationState !== "user_confirmed" ||
    assertion.inferenceState === "inferred" ||
    assertion.inferenceState === "unreadable" ||
    assertion.confidenceBand === "low" ||
    assertion.confidenceBand === "unknown"
  );
}

export function canConfirmCandidate(
  status: CandidateStatus,
  assertions: FieldAssertion[],
): boolean {
  if (status !== "in_review" && status !== "unreviewed") return false;
  if (assertions.length === 0) return false;

  return assertions.every(
    (assertion) =>
      assertion.verificationState === "user_confirmed" ||
      assertion.verificationState === "rejected",
  );
}

export interface ImportReviewProgress {
  total: number;
  confirmed: number;
  rejected: number;
  remaining: number;
}

export function getImportReviewProgress(assertions: FieldAssertion[]): ImportReviewProgress {
  const confirmed = assertions.filter(
    (assertion) => assertion.verificationState === "user_confirmed",
  ).length;
  const rejected = assertions.filter(
    (assertion) => assertion.verificationState === "rejected",
  ).length;

  return {
    total: assertions.length,
    confirmed,
    rejected,
    remaining: assertions.length - confirmed - rejected,
  };
}

export function reviewFieldAssertion(
  assertions: FieldAssertion[],
  assertionId: string,
  verificationState: "user_confirmed" | "rejected",
  correctedValue?: string,
): FieldAssertion[] {
  return assertions.map((assertion) => {
    if (assertion.id !== assertionId) return assertion;
    return {
      ...assertion,
      verificationState,
      correctedValue:
        verificationState === "user_confirmed" && correctedValue?.trim()
          ? correctedValue.trim()
          : undefined,
    };
  });
}
