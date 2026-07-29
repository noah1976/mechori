import type { Vehicle, VehicleCategory } from "./types.ts";
import type { VehicleIdentityCandidate } from "./vehicle-catalog.ts";

export type VehicleCatalogEntityType =
  | "corporate_group"
  | "manufacturer"
  | "marque"
  | "sales_channel"
  | "model_family"
  | "market_name"
  | "generation"
  | "variant"
  | "configuration";

export type VehicleCatalogNameKind =
  | "canonical"
  | "localized_name"
  | "historical_corporate_name"
  | "abbreviation"
  | "former_brand_name"
  | "common_name"
  | "known_typo"
  | "market_name"
  | "generation_name"
  | "grade_name"
  | "model_code";

export type VehicleCatalogMatchingMode = "exact" | "candidate_only";

export type VehicleCatalogEvidenceBasis =
  | "vehicle_itself"
  | "service_document"
  | "owners_manual"
  | "official_brochure"
  | "official_website"
  | "recalled_later"
  | "other"
  | "unknown";

export type VehicleCatalogSuggestionKind =
  | "vehicle_identity"
  | "name_alias"
  | "correction"
  | "relationship";

export type VehicleCatalogSuggestionStatus =
  | "pending"
  | "needs_information"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface VehicleCatalogSuggestionDraft {
  sourceVehicleId?: string;
  suggestionKind: VehicleCatalogSuggestionKind;
  vehicleCategory: VehicleCategory;
  makeInput: string;
  modelInput: string;
  gradeInput?: string;
  modelCodeInput?: string;
  modelYear?: number;
  proposedMakeName?: string;
  proposedModelName?: string;
  proposedName?: string;
  proposedNameKind?: VehicleCatalogNameKind;
  targetEntityId?: string;
  evidenceBasis: VehicleCatalogEvidenceBasis;
  evidenceNote?: string;
  notes?: string;
}

export interface VehicleCatalogSuggestionValidation {
  valid: boolean;
  errors: Partial<Record<keyof VehicleCatalogSuggestionDraft, string>>;
}

export interface VehicleCatalogEntityRecord {
  id: string;
  entityType: VehicleCatalogEntityType;
  canonicalName: string;
  parentEntityId?: string;
  marqueEntityId?: string;
  vehicleCategory?: VehicleCategory;
  regionCode?: string;
  status: "draft" | "published" | "retired";
}

export interface VehicleCatalogNameRecord {
  id: string;
  entityId: string;
  nameText: string;
  locale?: string;
  regionCode?: string;
  nameKind: VehicleCatalogNameKind;
  matchingMode: VehicleCatalogMatchingMode;
  status: "draft" | "published" | "retired";
}

export interface CollaborativeCatalogSnapshot {
  entities: VehicleCatalogEntityRecord[];
  names: VehicleCatalogNameRecord[];
}

export interface CollaborativeCatalogMatch {
  canonicalMake: string;
  canonicalModel?: string;
  brandId?: string;
  modelFamilyId?: string;
  marketNameId?: string;
  generationId?: string;
  variantId?: string;
  configurationId?: string;
  status: "exact" | "candidate" | "ambiguous" | "unmatched";
  matchedNameIds: string[];
  remainingModelText?: string;
}

const MAX_CURRENT_MODEL_YEAR = new Date().getUTCFullYear() + 2;

/**
 * Search-only normalization. The owner-entered string must be retained
 * separately and never replaced by this value.
 */
export function vehicleCatalogLookupKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[\s\-_/.,'’"“”()[\]{}・･]+/gu, "");
}

export function suggestionDraftFromVehicle(
  vehicle: Pick<
    Vehicle,
    "id" | "vehicleCategory" | "make" | "model" | "makeInput" | "modelInput" | "identityMatchStatus" | "grade" | "modelCode" | "year"
  >,
): VehicleCatalogSuggestionDraft {
  return {
    sourceVehicleId: vehicle.id,
    suggestionKind: vehicle.identityMatchStatus === "matched_alias"
      ? "name_alias"
      : "vehicle_identity",
    vehicleCategory: vehicle.vehicleCategory,
    makeInput: vehicle.makeInput ?? vehicle.make,
    modelInput: vehicle.modelInput ?? vehicle.model,
    gradeInput: vehicle.grade,
    modelCodeInput: vehicle.modelCode,
    modelYear: vehicle.year,
    evidenceBasis: "vehicle_itself",
  };
}

export function validateVehicleCatalogSuggestion(
  draft: VehicleCatalogSuggestionDraft,
): VehicleCatalogSuggestionValidation {
  const errors: VehicleCatalogSuggestionValidation["errors"] = {};
  const make = draft.makeInput.trim();
  const model = draft.modelInput.trim();
  const proposedName = draft.proposedName?.trim() ?? "";
  const proposedMakeName = draft.proposedMakeName?.trim() ?? "";
  const proposedModelName = draft.proposedModelName?.trim() ?? "";
  const evidenceNote = draft.evidenceNote?.trim() ?? "";
  const notes = draft.notes?.trim() ?? "";

  if (!make || make.length > 120) errors.makeInput = "invalid_make";
  if (!model || model.length > 160) errors.modelInput = "invalid_model";
  if ((draft.gradeInput?.trim().length ?? 0) > 160) errors.gradeInput = "grade_too_long";
  if ((draft.modelCodeInput?.trim().length ?? 0) > 120) errors.modelCodeInput = "model_code_too_long";
  if (
    draft.modelYear !== undefined
    && (!Number.isInteger(draft.modelYear)
      || draft.modelYear < 1886
      || draft.modelYear > MAX_CURRENT_MODEL_YEAR)
  ) {
    errors.modelYear = "invalid_model_year";
  }
  if (proposedName.length > 160) errors.proposedName = "proposed_name_too_long";
  if (proposedMakeName.length > 120) {
    errors.proposedMakeName = "proposed_make_name_too_long";
  }
  if (proposedModelName.length > 160) {
    errors.proposedModelName = "proposed_model_name_too_long";
  }
  if (evidenceNote.length > 500) errors.evidenceNote = "evidence_note_too_long";
  if (notes.length > 1000) errors.notes = "notes_too_long";
  if (draft.sourceVehicleId && draft.sourceVehicleId.length > 120) {
    errors.sourceVehicleId = "source_vehicle_id_too_long";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function publishedNamesFor(
  snapshot: CollaborativeCatalogSnapshot,
  entityId: string,
): VehicleCatalogNameRecord[] {
  return snapshot.names.filter(
    (name) => name.entityId === entityId && name.status === "published",
  );
}

function matchingNames(
  snapshot: CollaborativeCatalogSnapshot,
  entity: VehicleCatalogEntityRecord,
  inputKey: string,
  matchMode: "exact" | "prefix" | "contains",
): VehicleCatalogNameRecord[] {
  return publishedNamesFor(snapshot, entity.id).filter((name) => {
    const key = vehicleCatalogLookupKey(name.nameText);
    return key === inputKey
      || (matchMode === "prefix" && key.length > 0 && inputKey.startsWith(key))
      || (matchMode === "contains" && key.length > 0 && inputKey.includes(key));
  });
}

function descendantEntities(
  snapshot: CollaborativeCatalogSnapshot,
  parentId: string | undefined,
  entityType: VehicleCatalogEntityType,
): VehicleCatalogEntityRecord[] {
  if (!parentId) return [];
  return snapshot.entities.filter(
    (entity) =>
      entity.status === "published"
      && entity.entityType === entityType
      && entity.parentEntityId === parentId,
  );
}

function bestNamedEntity(
  snapshot: CollaborativeCatalogSnapshot,
  entities: VehicleCatalogEntityRecord[],
  inputKey: string,
  matchMode: "exact" | "prefix" | "contains",
): {
  entity?: VehicleCatalogEntityRecord;
  names: VehicleCatalogNameRecord[];
  ambiguous: boolean;
  candidateOnly: boolean;
  matchedLength: number;
} {
  const candidates = entities.flatMap((entity) =>
    matchingNames(snapshot, entity, inputKey, matchMode).map((name) => ({
      entity,
      name,
      length: vehicleCatalogLookupKey(name.nameText).length,
    }))
  ).sort((left, right) => right.length - left.length);

  const best = candidates[0];
  if (!best) {
    return { names: [], ambiguous: false, candidateOnly: false, matchedLength: 0 };
  }
  const sameLength = candidates.filter((candidate) => candidate.length === best.length);
  const entityIds = new Set(sameLength.map((candidate) => candidate.entity.id));
  return {
    entity: best.entity,
    names: sameLength
      .filter((candidate) => candidate.entity.id === best.entity.id)
      .map((candidate) => candidate.name),
    ambiguous: entityIds.size > 1,
    candidateOnly: sameLength.some(
      (candidate) =>
        candidate.entity.id === best.entity.id
        && candidate.name.matchingMode === "candidate_only",
    ),
    matchedLength: best.length,
  };
}

/**
 * Resolves only published catalog terms. Prefix matching is used to separate
 * a base model from grade/configuration text, but prefix matches remain
 * candidates until a user confirms them.
 */
export function resolveCollaborativeCatalog(
  snapshot: CollaborativeCatalogSnapshot,
  makeInput: string,
  modelInput: string,
): CollaborativeCatalogMatch {
  const makeKey = vehicleCatalogLookupKey(makeInput);
  const modelKey = vehicleCatalogLookupKey(modelInput);
  if (!makeKey || !modelKey) {
    return {
      canonicalMake: makeInput.trim().toLocaleUpperCase("en"),
      status: "unmatched",
      matchedNameIds: [],
    };
  }

  const marqueMatch = bestNamedEntity(
    snapshot,
    snapshot.entities.filter(
      (entity) => entity.status === "published" && entity.entityType === "marque",
    ),
    makeKey,
    "exact",
  );
  if (!marqueMatch.entity || marqueMatch.ambiguous) {
    return {
      canonicalMake: makeInput.trim().toLocaleUpperCase("en"),
      status: marqueMatch.ambiguous ? "ambiguous" : "unmatched",
      matchedNameIds: marqueMatch.names.map((name) => name.id),
    };
  }

  const marketMatch = bestNamedEntity(
    snapshot,
    snapshot.entities.filter(
      (entity) =>
        entity.status === "published"
        && entity.entityType === "market_name"
        && entity.marqueEntityId === marqueMatch.entity?.id,
    ),
    modelKey,
    "prefix",
  );
  if (!marketMatch.entity || marketMatch.ambiguous) {
    return {
      canonicalMake: marqueMatch.entity.canonicalName,
      brandId: marqueMatch.entity.id,
      status: marketMatch.ambiguous ? "ambiguous" : "candidate",
      matchedNameIds: [
        ...marqueMatch.names.map((name) => name.id),
        ...marketMatch.names.map((name) => name.id),
      ],
    };
  }

  const generationMatch = bestNamedEntity(
    snapshot,
    descendantEntities(
      snapshot,
      marketMatch.entity.parentEntityId,
      "generation",
    ),
    modelKey,
    "contains",
  );
  const variantMatch = bestNamedEntity(
    snapshot,
    descendantEntities(snapshot, generationMatch.entity?.id, "variant"),
    modelKey,
    "contains",
  );
  const configurationMatch = bestNamedEntity(
    snapshot,
    descendantEntities(snapshot, variantMatch.entity?.id, "configuration"),
    modelKey,
    "contains",
  );

  const matchedNames = [
    ...marqueMatch.names,
    ...marketMatch.names,
    ...generationMatch.names,
    ...variantMatch.names,
    ...configurationMatch.names,
  ];
  const marketKey = vehicleCatalogLookupKey(marketMatch.names[0]?.nameText ?? "");
  const detailKey = vehicleCatalogLookupKey(
    configurationMatch.names[0]?.nameText
      ?? variantMatch.names[0]?.nameText
      ?? generationMatch.names[0]?.nameText
      ?? "",
  );
  let remainingKey = modelKey;
  if (marketKey && remainingKey.startsWith(marketKey)) {
    remainingKey = remainingKey.slice(marketKey.length);
  }
  if (detailKey && detailKey !== marketKey) {
    remainingKey = remainingKey.replace(detailKey, "");
  }
  const exactModelMatch = remainingKey.length === 0;
  const candidateOnly = [
    marqueMatch,
    marketMatch,
    generationMatch,
    variantMatch,
    configurationMatch,
  ].some((match) => match.candidateOnly);
  const ambiguous = [
    generationMatch,
    variantMatch,
    configurationMatch,
  ].some((match) => match.ambiguous);

  return {
    canonicalMake: marqueMatch.entity.canonicalName,
    canonicalModel: marketMatch.entity.canonicalName,
    brandId: marqueMatch.entity.id,
    modelFamilyId: marketMatch.entity.parentEntityId,
    marketNameId: marketMatch.entity.id,
    generationId: generationMatch.entity?.id,
    variantId: variantMatch.entity?.id,
    configurationId: configurationMatch.entity?.id,
    status: ambiguous
      ? "ambiguous"
      : exactModelMatch && !candidateOnly
        ? "exact"
        : "candidate",
    matchedNameIds: matchedNames.map((name) => name.id),
    remainingModelText: exactModelMatch ? undefined : modelInput.trim(),
  };
}

export function collaborativeMatchIdentityOverride(
  match: CollaborativeCatalogMatch,
  makeInput: string,
  modelInput: string,
): VehicleIdentityCandidate | undefined {
  if (match.status !== "exact" || !match.brandId) return undefined;
  return {
    source: "text_alias",
    brandId: match.brandId,
    canonicalMake: match.canonicalMake,
    modelFamilyId: match.modelFamilyId,
    generationId: match.generationId,
    marketNameId: match.marketNameId,
    matchStatus: match.marketNameId ? "matched_alias" : "brand_only",
    makeInput: makeInput.trim(),
    modelInput: modelInput.trim(),
    equivalentMarketNames: match.canonicalModel ? [match.canonicalModel] : [],
  };
}
