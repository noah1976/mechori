export type PlanCode = "free" | "owner_plus" | "professional";

export type KnowledgeScope =
  | "registered_vehicles"
  | "all_public_standard"
  | "all_public_professional";

export type ClientAccess = "web_and_mobile" | "web_only";

export interface EntitlementConfig {
  freeMaxOwnedVehicles: number;
  ownerPlusMaxOwnedVehicles?: number;
  ocrMonthlyAllowance: Record<PlanCode, number>;
  aiStructuringMonthlyAllowance: Record<PlanCode, number>;
}

export interface EntitlementSet {
  maxOwnedVehicles?: number;
  knowledgeScope: KnowledgeScope;
  clientAccess: ClientAccess;
  adsEligible: boolean;
  ocrMonthlyAllowance: number;
  aiStructuringMonthlyAllowance: number;
  advancedFiltersEnabled: boolean;
  professionalWorkspaceEnabled: boolean;
}

export function resolveEntitlements(
  planCode: PlanCode,
  config: EntitlementConfig,
): EntitlementSet {
  const sharedAllowances = {
    ocrMonthlyAllowance: config.ocrMonthlyAllowance[planCode],
    aiStructuringMonthlyAllowance: config.aiStructuringMonthlyAllowance[planCode],
  };

  if (planCode === "professional") {
    return {
      ...sharedAllowances,
      knowledgeScope: "all_public_professional",
      clientAccess: "web_only",
      adsEligible: false,
      advancedFiltersEnabled: true,
      professionalWorkspaceEnabled: true,
    };
  }

  if (planCode === "owner_plus") {
    return {
      ...sharedAllowances,
      maxOwnedVehicles: config.ownerPlusMaxOwnedVehicles,
      knowledgeScope: "all_public_standard",
      clientAccess: "web_and_mobile",
      adsEligible: false,
      advancedFiltersEnabled: true,
      professionalWorkspaceEnabled: false,
    };
  }

  return {
    ...sharedAllowances,
    maxOwnedVehicles: config.freeMaxOwnedVehicles,
    knowledgeScope: "registered_vehicles",
    clientAccess: "web_and_mobile",
    adsEligible: true,
    advancedFiltersEnabled: false,
    professionalWorkspaceEnabled: false,
  };
}
