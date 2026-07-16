import { resolveHazardPolicy, type HazardPolicy, type HazardTagCode } from "./hazards.ts";
import type { HazardLevel, VerificationStatus } from "./types.ts";

export type VehicleMatchLevel =
  | "exact_specification"
  | "same_model_other_year"
  | "shared_engine_or_component"
  | "general_symptom";

export type KnowledgeOutcome =
  | "improved"
  | "no_change"
  | "worsened"
  | "unresolved"
  | "unknown";

export interface KnowledgeCaseEvidence {
  id: string;
  publicationStatus: "public" | "under_review" | "hidden";
  independentSourceKey: string;
  matchLevel: VehicleMatchLevel;
  observations: string[];
  causeCandidates: string[];
  reportedChecks: string[];
  reportedActions: string[];
  reportedParts: string[];
  outcome: KnowledgeOutcome;
  verificationStatus: VerificationStatus;
  hazardTags: HazardTagCode[];
  hazardLevel: HazardLevel;
  sourceTitle: string;
  sourceHref: string;
  sourceKind: "journal" | "structured_case" | "official";
}

export interface EvidenceBoundItem {
  text: string;
  supportingCaseIds: string[];
  independentReportCount: number;
}

export interface KnowledgeSynthesis {
  includedCaseIds: string[];
  matchLevels: VehicleMatchLevel[];
  reportedCauseCandidates: EvidenceBoundItem[];
  reportedChecks: EvidenceBoundItem[];
  reportedActions: EvidenceBoundItem[];
  reportedParts: EvidenceBoundItem[];
  outcomes: Record<KnowledgeOutcome, number>;
  unresolvedOrAdverseCaseIds: string[];
  hazardPolicy: HazardPolicy;
  insufficientEvidence: boolean;
  wordingPolicy: "evidence_bound_non_diagnostic";
  sources: Array<{
    caseId: string;
    title: string;
    href: string;
    kind: KnowledgeCaseEvidence["sourceKind"];
    verificationStatus: VerificationStatus;
    matchLevel: VehicleMatchLevel;
  }>;
}

interface AggregatedItem {
  text: string;
  caseIds: Set<string>;
  sourceKeys: Set<string>;
}

const outcomes: KnowledgeOutcome[] = [
  "improved",
  "no_change",
  "worsened",
  "unresolved",
  "unknown",
];

function normalizeEvidenceText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function aggregateItems(
  cases: KnowledgeCaseEvidence[],
  select: (knowledgeCase: KnowledgeCaseEvidence) => string[],
): EvidenceBoundItem[] {
  const aggregated = new Map<string, AggregatedItem>();

  for (const knowledgeCase of cases) {
    for (const rawText of select(knowledgeCase)) {
      const text = rawText.trim();
      if (!text) continue;

      const key = normalizeEvidenceText(text);
      const item = aggregated.get(key) ?? {
        text,
        caseIds: new Set<string>(),
        sourceKeys: new Set<string>(),
      };

      item.caseIds.add(knowledgeCase.id);
      item.sourceKeys.add(knowledgeCase.independentSourceKey);
      aggregated.set(key, item);
    }
  }

  return [...aggregated.values()]
    .map((item) => ({
      text: item.text,
      supportingCaseIds: [...item.caseIds].sort(),
      independentReportCount: item.sourceKeys.size,
    }))
    .sort(
      (left, right) =>
        right.independentReportCount - left.independentReportCount ||
        (left.text < right.text ? -1 : left.text > right.text ? 1 : 0),
    );
}

export function buildKnowledgeSynthesis(
  candidateCases: readonly KnowledgeCaseEvidence[],
): KnowledgeSynthesis {
  const publicCases = candidateCases.filter(
    (knowledgeCase) => knowledgeCase.publicationStatus === "public",
  );
  const outcomeCounts = Object.fromEntries(outcomes.map((outcome) => [outcome, 0])) as Record<
    KnowledgeOutcome,
    number
  >;

  for (const knowledgeCase of publicCases) {
    outcomeCounts[knowledgeCase.outcome] += 1;
  }

  const highestDeclaredLevel = publicCases.some(
    (knowledgeCase) => knowledgeCase.hazardLevel === "CRITICAL",
  )
    ? "CRITICAL"
    : publicCases.some((knowledgeCase) => knowledgeCase.hazardLevel === "CAUTION")
      ? "CAUTION"
      : "LOW";
  const hazardTags = publicCases.flatMap((knowledgeCase) => knowledgeCase.hazardTags);

  return {
    includedCaseIds: publicCases.map((knowledgeCase) => knowledgeCase.id).sort(),
    matchLevels: [...new Set(publicCases.map((knowledgeCase) => knowledgeCase.matchLevel))],
    reportedCauseCandidates: aggregateItems(publicCases, (item) => item.causeCandidates),
    reportedChecks: aggregateItems(publicCases, (item) => item.reportedChecks),
    reportedActions: aggregateItems(publicCases, (item) => item.reportedActions),
    reportedParts: aggregateItems(publicCases, (item) => item.reportedParts),
    outcomes: outcomeCounts,
    unresolvedOrAdverseCaseIds: publicCases
      .filter((knowledgeCase) =>
        ["no_change", "worsened", "unresolved"].includes(knowledgeCase.outcome),
      )
      .map((knowledgeCase) => knowledgeCase.id)
      .sort(),
    hazardPolicy: resolveHazardPolicy(hazardTags, highestDeclaredLevel),
    insufficientEvidence: publicCases.length === 0,
    wordingPolicy: "evidence_bound_non_diagnostic",
    sources: publicCases.map((knowledgeCase) => ({
      caseId: knowledgeCase.id,
      title: knowledgeCase.sourceTitle,
      href: knowledgeCase.sourceHref,
      kind: knowledgeCase.sourceKind,
      verificationStatus: knowledgeCase.verificationStatus,
      matchLevel: knowledgeCase.matchLevel,
    })),
  };
}

export function filterKnowledgeCasesByText(
  candidateCases: readonly KnowledgeCaseEvidence[],
  query: string,
): KnowledgeCaseEvidence[] {
  const normalizedQuery = normalizeEvidenceText(query);
  if (!normalizedQuery) return [...candidateCases];

  const terms = normalizedQuery.split(" ").filter(Boolean);

  return candidateCases.filter((knowledgeCase) => {
    const searchable = normalizeEvidenceText(
      [
        ...knowledgeCase.observations,
        ...knowledgeCase.causeCandidates,
        ...knowledgeCase.reportedChecks,
        ...knowledgeCase.reportedActions,
        ...knowledgeCase.reportedParts,
      ].join(" "),
    );

    return terms.every((term) => searchable.includes(term));
  });
}

export function isSynthesisGrounded(
  synthesis: KnowledgeSynthesis,
  sourceCases: readonly KnowledgeCaseEvidence[],
): boolean {
  const publicCasesById = new Map(
    sourceCases
      .filter((knowledgeCase) => knowledgeCase.publicationStatus === "public")
      .map((knowledgeCase) => [knowledgeCase.id, knowledgeCase]),
  );
  const sections: Array<
    [EvidenceBoundItem[], (knowledgeCase: KnowledgeCaseEvidence) => string[]]
  > = [
    [synthesis.reportedCauseCandidates, (item) => item.causeCandidates],
    [synthesis.reportedChecks, (item) => item.reportedChecks],
    [synthesis.reportedActions, (item) => item.reportedActions],
    [synthesis.reportedParts, (item) => item.reportedParts],
  ];

  return sections.every(([items, select]) =>
    items.every((item) =>
      item.supportingCaseIds.length > 0 &&
      item.supportingCaseIds.every((caseId) => {
        const source = publicCasesById.get(caseId);
        return (
          source !== undefined &&
          select(source).some(
            (sourceText) => normalizeEvidenceText(sourceText) === normalizeEvidenceText(item.text),
          )
        );
      }),
    ),
  );
}
