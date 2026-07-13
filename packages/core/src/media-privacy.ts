export type SensitiveRegionKind =
  | "license_plate"
  | "other_vehicle_plate"
  | "face"
  | "address"
  | "document_personal_data"
  | "other";

export type RedactionMethod =
  | "solid_fill"
  | "destructive_rasterization"
  | "crop";

export type SensitiveRegionStatus =
  | "detected"
  | "redacted"
  | "user_confirmed_false_positive";

export interface SensitiveRegionReview {
  id: string;
  kind: SensitiveRegionKind;
  status: SensitiveRegionStatus;
  redactionMethod?: RedactionMethod;
}

export interface MediaPrivacyState {
  assetKind: "original" | "redacted_derivative";
  metadataState: "unknown" | "removed";
  detectionState: "not_run" | "completed" | "failed";
  manualReviewState:
    | "pending"
    | "confirmed_no_sensitive_content"
    | "confirmed_redactions";
  sensitiveRegions: SensitiveRegionReview[];
}

export type MediaPublishBlockReason =
  | "original_asset"
  | "metadata_not_removed"
  | "detection_incomplete"
  | "manual_review_incomplete"
  | "unresolved_sensitive_region"
  | "missing_redaction_method";

export interface MediaPublishability {
  publishable: boolean;
  reasons: MediaPublishBlockReason[];
}

export function assessMediaPublishability(
  state: MediaPrivacyState,
): MediaPublishability {
  const reasons = new Set<MediaPublishBlockReason>();

  if (state.assetKind !== "redacted_derivative") reasons.add("original_asset");
  if (state.metadataState !== "removed") reasons.add("metadata_not_removed");
  if (state.detectionState !== "completed") reasons.add("detection_incomplete");
  if (state.manualReviewState === "pending") reasons.add("manual_review_incomplete");

  for (const region of state.sensitiveRegions) {
    if (region.status === "detected") reasons.add("unresolved_sensitive_region");
    if (region.status === "redacted" && !region.redactionMethod) {
      reasons.add("missing_redaction_method");
    }
  }

  return {
    publishable: reasons.size === 0,
    reasons: [...reasons],
  };
}
