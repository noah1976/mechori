import type { HazardLevel } from "./types.ts";

export type HazardTagCode =
  | "brakes"
  | "steering"
  | "fuel"
  | "tires"
  | "wheel_fastening"
  | "suspension"
  | "vehicle_support"
  | "airbags"
  | "high_voltage"
  | "low_voltage_electrical"
  | "hot_engine_exhaust"
  | "pressurized_cooling"
  | "battery"
  | "open_flame"
  | "legal_modification";

export interface HazardTagDefinition {
  code: HazardTagCode;
  minimumLevel: HazardLevel;
  requiresExpertConfirmation: boolean;
  requiresLegalNotice: boolean;
}

export interface HazardPolicy {
  effectiveLevel: HazardLevel;
  requiresExpertConfirmation: boolean;
  requiresModeratorReview: boolean;
  requiresPreDisplayWarning: boolean;
  requiresLegalNotice: boolean;
}

export const hazardTagDefinitions: Readonly<Record<HazardTagCode, HazardTagDefinition>> = {
  brakes: definition("brakes", "CRITICAL", true),
  steering: definition("steering", "CRITICAL", true),
  fuel: definition("fuel", "CRITICAL", true),
  tires: definition("tires", "CAUTION", false),
  wheel_fastening: definition("wheel_fastening", "CRITICAL", true),
  suspension: definition("suspension", "CAUTION", true),
  vehicle_support: definition("vehicle_support", "CRITICAL", true),
  airbags: definition("airbags", "CRITICAL", true),
  high_voltage: definition("high_voltage", "CRITICAL", true),
  low_voltage_electrical: definition("low_voltage_electrical", "CAUTION", false),
  hot_engine_exhaust: definition("hot_engine_exhaust", "CAUTION", false),
  pressurized_cooling: definition("pressurized_cooling", "CAUTION", false),
  battery: definition("battery", "CAUTION", false),
  open_flame: definition("open_flame", "CRITICAL", true),
  legal_modification: definition("legal_modification", "CAUTION", true, true),
};

const levelWeight: Record<HazardLevel, number> = {
  LOW: 0,
  CAUTION: 1,
  CRITICAL: 2,
};

function definition(
  code: HazardTagCode,
  minimumLevel: HazardLevel,
  requiresExpertConfirmation: boolean,
  requiresLegalNotice = false,
): HazardTagDefinition {
  return { code, minimumLevel, requiresExpertConfirmation, requiresLegalNotice };
}

function maximumLevel(levels: HazardLevel[]): HazardLevel {
  return levels.reduce<HazardLevel>(
    (highest, level) => (levelWeight[level] > levelWeight[highest] ? level : highest),
    "LOW",
  );
}

export function resolveHazardPolicy(
  tagCodes: readonly HazardTagCode[],
  declaredLevel: HazardLevel = "LOW",
): HazardPolicy {
  const definitions = [...new Set(tagCodes)].map((code) => hazardTagDefinitions[code]);
  const effectiveLevel = maximumLevel([
    declaredLevel,
    ...definitions.map((item) => item.minimumLevel),
  ]);

  return {
    effectiveLevel,
    requiresExpertConfirmation:
      effectiveLevel === "CRITICAL" ||
      definitions.some((item) => item.requiresExpertConfirmation),
    requiresModeratorReview: effectiveLevel === "CRITICAL",
    requiresPreDisplayWarning: effectiveLevel === "CRITICAL",
    requiresLegalNotice: definitions.some((item) => item.requiresLegalNotice),
  };
}
