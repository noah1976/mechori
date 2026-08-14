import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  validateVehicleCatalogSuggestion,
  type CollaborativeCatalogSnapshot,
  type VehicleCatalogEntityRecord,
  type VehicleCatalogEntityType,
  type VehicleCatalogMatchingMode,
  type VehicleCatalogNameKind,
  type VehicleCatalogNameRecord,
  type VehicleCatalogSuggestionDraft,
  type VehicleCatalogSuggestionStatus,
} from "@mechori/core";

export interface VehicleCatalogSuggestionRecord extends VehicleCatalogSuggestionDraft {
  id: string;
  submittedByUserId: string;
  status: VehicleCatalogSuggestionStatus;
  reviewerNote?: string;
  createdAt: string;
  updatedAt: string;
}

interface CatalogEntityRow {
  id: string;
  entity_type: VehicleCatalogEntityType;
  canonical_name: string;
  parent_entity_id: string | null;
  marque_entity_id: string | null;
  vehicle_category: VehicleCatalogEntityRecord["vehicleCategory"] | null;
  region_code: string | null;
  status: VehicleCatalogEntityRecord["status"];
}

interface CatalogNameRow {
  id: string;
  entity_id: string;
  name_text: string;
  locale: string | null;
  region_code: string | null;
  name_kind: VehicleCatalogNameKind;
  matching_mode: VehicleCatalogMatchingMode;
  status: VehicleCatalogNameRecord["status"];
}

interface CatalogSuggestionRow {
  id: string;
  submitted_by_user_id: string;
  source_vehicle_id: string | null;
  suggestion_kind: VehicleCatalogSuggestionRecord["suggestionKind"];
  vehicle_category: VehicleCatalogSuggestionRecord["vehicleCategory"];
  make_input: string;
  model_input: string;
  grade_input: string | null;
  model_code_input: string | null;
  model_year: number | null;
  proposed_make_name: string | null;
  proposed_model_name: string | null;
  proposed_name: string | null;
  proposed_name_kind: VehicleCatalogNameKind | null;
  target_entity_id: string | null;
  evidence_basis: VehicleCatalogSuggestionRecord["evidenceBasis"];
  evidence_note: string | null;
  notes: string | null;
  status: VehicleCatalogSuggestionStatus;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
}

function cleanOptional(value: string | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  return cleaned || null;
}

function mapEntity(row: CatalogEntityRow): VehicleCatalogEntityRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    canonicalName: row.canonical_name,
    parentEntityId: row.parent_entity_id ?? undefined,
    marqueEntityId: row.marque_entity_id ?? undefined,
    vehicleCategory: row.vehicle_category ?? undefined,
    regionCode: row.region_code ?? undefined,
    status: row.status,
  };
}

function mapName(row: CatalogNameRow): VehicleCatalogNameRecord {
  return {
    id: row.id,
    entityId: row.entity_id,
    nameText: row.name_text,
    locale: row.locale ?? undefined,
    regionCode: row.region_code ?? undefined,
    nameKind: row.name_kind,
    matchingMode: row.matching_mode,
    status: row.status,
  };
}

function mapSuggestion(row: CatalogSuggestionRow): VehicleCatalogSuggestionRecord {
  return {
    id: row.id,
    submittedByUserId: row.submitted_by_user_id,
    sourceVehicleId: row.source_vehicle_id ?? undefined,
    suggestionKind: row.suggestion_kind,
    vehicleCategory: row.vehicle_category,
    makeInput: row.make_input,
    modelInput: row.model_input,
    gradeInput: row.grade_input ?? undefined,
    modelCodeInput: row.model_code_input ?? undefined,
    modelYear: row.model_year ?? undefined,
    proposedMakeName: row.proposed_make_name ?? undefined,
    proposedModelName: row.proposed_model_name ?? undefined,
    proposedName: row.proposed_name ?? undefined,
    proposedNameKind: row.proposed_name_kind ?? undefined,
    targetEntityId: row.target_entity_id ?? undefined,
    evidenceBasis: row.evidence_basis,
    evidenceNote: row.evidence_note ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    reviewerNote: row.reviewer_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadPublishedVehicleCatalog(): Promise<CollaborativeCatalogSnapshot> {
  const supabase = createSupabaseBrowserClient();
  const [entityResult, nameResult] = await Promise.all([
    supabase
      .from("vehicle_catalog_entities")
      .select("id,entity_type,canonical_name,parent_entity_id,marque_entity_id,vehicle_category,region_code,status")
      .eq("status", "published"),
    supabase
      .from("vehicle_catalog_names")
      .select("id,entity_id,name_text,locale,region_code,name_kind,matching_mode,status")
      .eq("status", "published"),
  ]);
  if (entityResult.error) throw entityResult.error;
  if (nameResult.error) throw nameResult.error;
  return {
    entities: (entityResult.data as CatalogEntityRow[]).map(mapEntity),
    names: (nameResult.data as CatalogNameRow[]).map(mapName),
  };
}

export async function submitVehicleCatalogSuggestion(
  draft: VehicleCatalogSuggestionDraft,
): Promise<VehicleCatalogSuggestionRecord> {
  const validation = validateVehicleCatalogSuggestion(draft);
  if (!validation.valid) throw new Error("invalid_catalog_suggestion");

  const supabase = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("authentication_required");

  const { data, error } = await supabase
    .from("vehicle_catalog_suggestions")
    .insert({
      submitted_by_user_id: authData.user.id,
      source_vehicle_id: cleanOptional(draft.sourceVehicleId),
      suggestion_kind: draft.suggestionKind,
      vehicle_category: draft.vehicleCategory,
      make_input: draft.makeInput.trim(),
      model_input: draft.modelInput.trim(),
      grade_input: cleanOptional(draft.gradeInput),
      model_code_input: cleanOptional(draft.modelCodeInput),
      model_year: draft.modelYear ?? null,
      proposed_make_name: cleanOptional(draft.proposedMakeName),
      proposed_model_name: cleanOptional(draft.proposedModelName),
      proposed_name: cleanOptional(draft.proposedName),
      proposed_name_kind: draft.proposedNameKind ?? null,
      target_entity_id: cleanOptional(draft.targetEntityId),
      evidence_basis: draft.evidenceBasis,
      evidence_note: cleanOptional(draft.evidenceNote),
      notes: cleanOptional(draft.notes),
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapSuggestion(data as CatalogSuggestionRow);
}

export async function listMyVehicleCatalogSuggestions(): Promise<VehicleCatalogSuggestionRecord[]> {
  const { data, error } = await createSupabaseBrowserClient()
    .from("vehicle_catalog_suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CatalogSuggestionRow[]).map(mapSuggestion);
}

export async function listVehicleCatalogReviewQueue(): Promise<VehicleCatalogSuggestionRecord[]> {
  const { data, error } = await createSupabaseBrowserClient()
    .from("vehicle_catalog_suggestions")
    .select("*")
    .in("status", ["pending", "needs_information"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CatalogSuggestionRow[]).map(mapSuggestion);
}

export async function reviewVehicleCatalogSuggestion(
  suggestionId: string,
  decision: "needs_information" | "accepted" | "rejected",
  reviewerNote?: string,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc(
    "review_vehicle_catalog_suggestion",
    {
      p_suggestion_id: suggestionId,
      p_decision: decision,
      p_reviewer_note: cleanOptional(reviewerNote),
    },
  );
  if (error) throw error;
}

export interface PublishCatalogNameInput {
  suggestionId: string;
  targetEntityId: string;
  nameText: string;
  nameKind: VehicleCatalogNameKind;
  matchingMode: VehicleCatalogMatchingMode;
  locale?: string;
  regionCode?: string;
  sourceNote?: string;
}

export async function publishVehicleCatalogName(
  input: PublishCatalogNameInput,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc(
    "publish_vehicle_catalog_name_suggestion",
    {
      p_suggestion_id: input.suggestionId,
      p_target_entity_id: input.targetEntityId.trim(),
      p_name_text: input.nameText.trim(),
      p_name_kind: input.nameKind,
      p_matching_mode: input.matchingMode,
      p_locale: cleanOptional(input.locale),
      p_region_code: cleanOptional(input.regionCode),
      p_source_note: cleanOptional(input.sourceNote),
    },
  );
  if (error) throw error;
}

export interface PublishCatalogEntityInput {
  suggestionId: string;
  entityId: string;
  entityType: VehicleCatalogEntityType;
  canonicalName: string;
  parentEntityId?: string;
  marqueEntityId?: string;
  vehicleCategory?: VehicleCatalogEntityRecord["vehicleCategory"];
  regionCode?: string;
  nameKind: VehicleCatalogNameKind;
  matchingMode: VehicleCatalogMatchingMode;
  reviewerNote?: string;
}

export async function publishVehicleCatalogEntity(
  input: PublishCatalogEntityInput,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc(
    "publish_vehicle_catalog_entity_suggestion",
    {
      p_suggestion_id: input.suggestionId,
      p_entity_id: input.entityId.trim(),
      p_entity_type: input.entityType,
      p_canonical_name: input.canonicalName.trim(),
      p_parent_entity_id: cleanOptional(input.parentEntityId),
      p_marque_entity_id: cleanOptional(input.marqueEntityId),
      p_vehicle_category: input.vehicleCategory ?? null,
      p_region_code: cleanOptional(input.regionCode),
      p_name_kind: input.nameKind,
      p_matching_mode: input.matchingMode,
      p_reviewer_note: cleanOptional(input.reviewerNote),
    },
  );
  if (error) throw error;
}

export interface PublishCatalogModelInput {
  suggestionId: string;
  familyEntityId: string;
  marketNameEntityId: string;
  marqueEntityId: string;
  canonicalModelName: string;
  regionCode?: string;
  matchingMode: VehicleCatalogMatchingMode;
  reviewerNote?: string;
}

export async function publishVehicleCatalogModel(
  input: PublishCatalogModelInput,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc(
    "publish_vehicle_catalog_model_suggestion",
    {
      p_suggestion_id: input.suggestionId,
      p_family_entity_id: input.familyEntityId.trim(),
      p_market_name_entity_id: input.marketNameEntityId.trim(),
      p_marque_entity_id: input.marqueEntityId.trim(),
      p_canonical_model_name: input.canonicalModelName.trim(),
      p_region_code: cleanOptional(input.regionCode),
      p_matching_mode: input.matchingMode,
      p_reviewer_note: cleanOptional(input.reviewerNote),
    },
  );
  if (error) throw error;
}
