import type {
  Locale,
  Vehicle,
  VehicleIdentityMatchStatus,
  VehicleSpecificationMatchStatus,
} from "./types.ts";

export interface VehicleIdentityCandidate {
  source: "text_alias" | "photo_candidate";
  brandId?: string;
  canonicalMake: string;
  modelFamilyId?: string;
  generationId?: string;
  marketNameId?: string;
  marketRegion?: string;
  matchStatus: VehicleIdentityMatchStatus;
  makeInput: string;
  modelInput: string;
  equivalentMarketNames: string[];
}

export type VehicleIdentityRelationType =
  | "market_name_variant"
  | "oem_rebadge"
  | "brand_transition"
  | "licensed_continuation"
  | "inspired_derivative";

export interface RelatedVehicleIdentity {
  marketNameId: string;
  modelFamilyId: string;
  canonicalMake: string;
  model: string;
  relationType: VehicleIdentityRelationType;
}

export interface VehicleSpecificationCandidate {
  generationId?: string;
  generationLabel?: string;
  variantId?: string;
  variantLabel?: string;
  matchStatus: VehicleSpecificationMatchStatus;
  matchedBy?: "model_code" | "grade";
  conflict?: "grade_model_code_mismatch";
}

export type VehicleApplicabilityLevel =
  | "exact_variant"
  | "same_generation_other_variant"
  | "same_family_other_generation"
  | "same_family_unspecified"
  | "different_family";

interface BrandDefinition {
  id: string;
  canonicalName: string;
  aliases: string[];
}

interface MarketNameDefinition {
  id: string;
  familyId: string;
  brandId: string;
  region: string;
  names: Record<Locale, string>;
  aliases: string[];
}

interface MarketNameRelationDefinition {
  leftMarketNameId: string;
  rightMarketNameId: string;
  relationType: VehicleIdentityRelationType;
}

interface GenerationDefinition {
  id: string;
  familyId: string;
  labels: Record<Locale, string>;
  modelCodeFragments: string[];
  gradeAliases?: string[];
}

interface VariantDefinition {
  id: string;
  generationId: string;
  labels: Record<Locale, string>;
  modelCodes: string[];
  gradeAliases: string[];
}

const BRANDS: BrandDefinition[] = [
  { id: "fiat", canonicalName: "FIAT", aliases: ["FIAT", "Fiat", "フィアット"] },
  { id: "nissan", canonicalName: "NISSAN", aliases: ["NISSAN", "Nissan", "日産", "ニッサン"] },
  { id: "honda", canonicalName: "HONDA", aliases: ["HONDA", "Honda", "本田", "ホンダ"] },
  { id: "toyota", canonicalName: "TOYOTA", aliases: ["TOYOTA", "Toyota", "トヨタ"] },
  { id: "suzuki", canonicalName: "SUZUKI", aliases: ["SUZUKI", "Suzuki", "スズキ"] },
  { id: "mazda", canonicalName: "MAZDA", aliases: ["MAZDA", "Mazda", "マツダ"] },
  { id: "mg", canonicalName: "MG", aliases: ["MG", "エムジー"] },
  { id: "bertone", canonicalName: "BERTONE", aliases: ["BERTONE", "Bertone", "ベルトーネ"] },
  { id: "alfa-romeo", canonicalName: "ALFA ROMEO", aliases: ["ALFA ROMEO", "Alfa Romeo", "アルファロメオ"] },
  { id: "vespa", canonicalName: "VESPA", aliases: ["VESPA", "Vespa", "ベスパ"] },
  { id: "lotus", canonicalName: "LOTUS", aliases: ["LOTUS", "Lotus", "ロータス"] },
  { id: "caterham", canonicalName: "CATERHAM", aliases: ["CATERHAM", "Caterham", "ケータハム"] },
  { id: "birkin", canonicalName: "BIRKIN", aliases: ["BIRKIN", "Birkin", "バーキン"] },
  { id: "opel", canonicalName: "OPEL", aliases: ["OPEL", "Opel", "オペル"] },
  { id: "vauxhall", canonicalName: "VAUXHALL", aliases: ["VAUXHALL", "Vauxhall", "ボクスホール"] },
];

const MARKET_NAMES: MarketNameDefinition[] = [
  {
    id: "fiat-barchetta-global",
    familyId: "fiat-barchetta",
    brandId: "fiat",
    region: "global",
    names: { ja: "バルケッタ", en: "Barchetta" },
    aliases: ["Barchetta", "バルケッタ"],
  },
  {
    id: "fiat-x1-9-global",
    familyId: "fiat-x1-9",
    brandId: "fiat",
    region: "global",
    names: { ja: "X1/9", en: "X1/9" },
    aliases: ["X1/9", "X1-9", "X 1/9"],
  },
  {
    id: "bertone-x1-9-global",
    familyId: "fiat-x1-9",
    brandId: "bertone",
    region: "global",
    names: { ja: "X1/9", en: "X1/9" },
    aliases: ["X1/9", "X1-9", "X 1/9"],
  },
  {
    id: "nissan-skyline-global",
    familyId: "nissan-skyline",
    brandId: "nissan",
    region: "global",
    names: { ja: "スカイライン", en: "SKYLINE" },
    aliases: ["SKYLINE", "Skyline", "スカイライン"],
  },
  {
    id: "honda-civic-global",
    familyId: "honda-civic",
    brandId: "honda",
    region: "global",
    names: { ja: "シビック", en: "CIVIC" },
    aliases: ["CIVIC", "Civic", "シビック"],
  },
  {
    id: "toyota-vitz-jp",
    familyId: "toyota-yaris-vitz",
    brandId: "toyota",
    region: "JP",
    names: { ja: "ヴィッツ", en: "Vitz" },
    aliases: ["VITZ", "Vitz", "ヴィッツ"],
  },
  {
    id: "toyota-yaris-global",
    familyId: "toyota-yaris-vitz",
    brandId: "toyota",
    region: "global",
    names: { ja: "ヤリス", en: "YARIS" },
    aliases: ["YARIS", "Yaris", "ヤリス"],
  },
  {
    id: "suzuki-jimny-nomade-jp",
    familyId: "suzuki-jimny-nomade",
    brandId: "suzuki",
    region: "JP",
    names: { ja: "ジムニー ノマド", en: "JIMNY NOMADE" },
    aliases: ["JIMNY NOMADE", "Jimny Nomade", "ジムニーノマド", "ジムニー ノマド"],
  },
  {
    id: "mg-mgb-global",
    familyId: "mg-mgb",
    brandId: "mg",
    region: "global",
    names: { ja: "MGB", en: "MGB" },
    aliases: ["MGB", "MG-B", "MGB Roadster"],
  },
  {
    id: "alfa-romeo-145-global",
    familyId: "alfa-romeo-145",
    brandId: "alfa-romeo",
    region: "global",
    names: { ja: "145", en: "145" },
    aliases: ["145"],
  },
  {
    id: "vespa-150-sprint-global",
    familyId: "vespa-150-sprint",
    brandId: "vespa",
    region: "global",
    names: { ja: "150 Sprint", en: "150 Sprint" },
    aliases: ["150 Sprint", "150スプリント"],
  },
  {
    id: "opel-speedster-eu",
    familyId: "gm-speedster-vx220",
    brandId: "opel",
    region: "EU",
    names: { ja: "スピードスター", en: "Speedster" },
    aliases: ["Speedster", "スピードスター"],
  },
  {
    id: "vauxhall-vx220-uk",
    familyId: "gm-speedster-vx220",
    brandId: "vauxhall",
    region: "GB",
    names: { ja: "VX220", en: "VX220" },
    aliases: ["VX220", "VX 220", "Speedster", "スピードスター"],
  },
  {
    id: "mazda-az-1-jp",
    familyId: "mazda-az1-suzuki-cara",
    brandId: "mazda",
    region: "JP",
    names: { ja: "AZ-1", en: "AZ-1" },
    aliases: ["AZ-1", "AZ1"],
  },
  {
    id: "suzuki-cara-jp",
    familyId: "mazda-az1-suzuki-cara",
    brandId: "suzuki",
    region: "JP",
    names: { ja: "キャラ", en: "CARA" },
    aliases: ["CARA", "Cara", "キャラ"],
  },
  {
    id: "lotus-seven-global",
    familyId: "lotus-seven",
    brandId: "lotus",
    region: "global",
    names: { ja: "セブン", en: "Seven" },
    aliases: ["Seven", "7", "Super Seven", "セブン", "スーパーセブン"],
  },
  {
    id: "caterham-seven-global",
    familyId: "caterham-seven",
    brandId: "caterham",
    region: "global",
    names: { ja: "セブン", en: "Seven" },
    aliases: ["Seven", "7", "Super Seven", "セブン", "スーパーセブン"],
  },
  {
    id: "birkin-s3-global",
    familyId: "birkin-s3",
    brandId: "birkin",
    region: "global",
    names: { ja: "S3 ロードスター", en: "S3 Roadster" },
    aliases: ["S3 Roadster", "S3", "Seven", "7", "S3 ロードスター", "セブン"],
  },
];

const MARKET_NAME_RELATIONS: MarketNameRelationDefinition[] = [
  { leftMarketNameId: "toyota-vitz-jp", rightMarketNameId: "toyota-yaris-global", relationType: "market_name_variant" },
  { leftMarketNameId: "fiat-x1-9-global", rightMarketNameId: "bertone-x1-9-global", relationType: "brand_transition" },
  { leftMarketNameId: "opel-speedster-eu", rightMarketNameId: "vauxhall-vx220-uk", relationType: "market_name_variant" },
  { leftMarketNameId: "mazda-az-1-jp", rightMarketNameId: "suzuki-cara-jp", relationType: "oem_rebadge" },
  { leftMarketNameId: "lotus-seven-global", rightMarketNameId: "caterham-seven-global", relationType: "licensed_continuation" },
  { leftMarketNameId: "lotus-seven-global", rightMarketNameId: "birkin-s3-global", relationType: "inspired_derivative" },
];

// This catalog is intentionally small. It proves the hierarchy without pretending
// MECHORI already has an exhaustive worldwide grade database.
const GENERATIONS: GenerationDefinition[] = [
  {
    id: "nissan-skyline-r33",
    familyId: "nissan-skyline",
    labels: { ja: "R33", en: "R33" },
    modelCodeFragments: ["R33"],
    gradeAliases: ["R33"],
  },
];

const VARIANTS: VariantDefinition[] = [
  {
    id: "nissan-skyline-r33-gts25t",
    generationId: "nissan-skyline-r33",
    labels: { ja: "GTS25t系", en: "GTS25t family" },
    modelCodes: ["ECR33"],
    gradeAliases: ["GTS25T", "GTS25T TYPE M", "GTS25T TYPEM"],
  },
  {
    id: "nissan-skyline-r33-gtr",
    generationId: "nissan-skyline-r33",
    labels: { ja: "GT-R系", en: "GT-R family" },
    modelCodes: ["BCNR33"],
    gradeAliases: ["GT-R", "GTR", "GT-R V-SPEC", "GTR VSPEC"],
  },
];

function aliasKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function unknownCanonicalMake(value: string): string {
  const trimmed = value.trim();
  const characters = [...trimmed];
  const usesLatinAlphabet = characters.some((character) => /\p{Script=Latin}/u.test(character)) &&
    !characters.some((character) => /\p{Letter}/u.test(character) && !/\p{Script=Latin}/u.test(character));
  return usesLatinAlphabet ? trimmed.toLocaleUpperCase("en") : trimmed;
}

function normalizedSpecificationText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleUpperCase("en")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedModelCode(value: string): string {
  return normalizedSpecificationText(value).replace(/\s+/g, "");
}

export function resolveVehicleSpecification(
  modelFamilyId: string | undefined,
  details: { grade?: string; modelCode?: string },
  locale: Locale = "ja",
): VehicleSpecificationCandidate {
  if (!modelFamilyId) return { matchStatus: "unmatched" };

  const modelCode = normalizedModelCode(details.modelCode ?? "");
  const grade = normalizedSpecificationText(details.grade ?? "");

  if (modelCode) {
    const variant = VARIANTS.find((item) =>
      item.modelCodes.some((code) => modelCode.endsWith(normalizedModelCode(code))),
    );
    if (variant) {
      const generation = GENERATIONS.find((item) => item.id === variant.generationId);
      if (generation?.familyId === modelFamilyId) {
        const gradeVariant = grade
          ? VARIANTS.find(
              (item) =>
                item.generationId === generation.id &&
                item.gradeAliases.some((alias) => grade.includes(normalizedSpecificationText(alias))),
            )
          : undefined;
        const conflict = gradeVariant && gradeVariant.id !== variant.id
          ? "grade_model_code_mismatch" as const
          : undefined;
        return {
          generationId: generation.id,
          generationLabel: generation.labels[locale],
          variantId: variant.id,
          variantLabel: variant.labels[locale],
          matchStatus: conflict ? "conflicting_inputs" : "confirmed_model_code",
          matchedBy: "model_code",
          conflict,
        };
      }
    }

    const generation = GENERATIONS.find(
      (item) =>
        item.familyId === modelFamilyId &&
        item.modelCodeFragments.some((fragment) => modelCode.includes(normalizedModelCode(fragment))),
    );
    if (generation) {
      return {
        generationId: generation.id,
        generationLabel: generation.labels[locale],
        matchStatus: "generation_candidate",
        matchedBy: "model_code",
      };
    }
  }

  if (grade) {
    const generation = GENERATIONS.find(
      (item) =>
        item.familyId === modelFamilyId &&
        item.gradeAliases?.some((alias) => grade.includes(normalizedSpecificationText(alias))),
    );
    const variant = VARIANTS.find((item) =>
      item.generationId === generation?.id &&
      item.gradeAliases.some((alias) => grade.includes(normalizedSpecificationText(alias))),
    );
    if (variant) {
      if (generation?.familyId === modelFamilyId) {
        return {
          generationId: generation.id,
          generationLabel: generation.labels[locale],
          variantId: variant.id,
          variantLabel: variant.labels[locale],
          matchStatus: "grade_candidate",
          matchedBy: "grade",
        };
      }
    }

    if (generation) {
      return {
        generationId: generation.id,
        generationLabel: generation.labels[locale],
        matchStatus: "generation_candidate",
        matchedBy: "grade",
      };
    }
  }

  return { matchStatus: "unmatched" };
}

export function compareVehicleApplicability(
  target: Pick<Vehicle, "modelFamilyId" | "generationId" | "variantId" | "specificationMatchStatus">,
  source: Pick<Vehicle, "modelFamilyId" | "generationId" | "variantId" | "specificationMatchStatus">,
): VehicleApplicabilityLevel {
  if (!target.modelFamilyId || target.modelFamilyId !== source.modelFamilyId) {
    return "different_family";
  }
  if (!target.generationId || !source.generationId) return "same_family_unspecified";
  if (target.generationId !== source.generationId) return "same_family_other_generation";
  if (!target.variantId || !source.variantId) return "same_family_unspecified";
  if (
    target.specificationMatchStatus !== "confirmed_model_code" ||
    source.specificationMatchStatus !== "confirmed_model_code"
  ) return "same_family_unspecified";
  return target.variantId === source.variantId
    ? "exact_variant"
    : "same_generation_other_variant";
}

export function resolveVehicleIdentity(make: string, model: string): VehicleIdentityCandidate {
  const makeInput = make.trim();
  const modelInput = model.trim();
  const makeKey = aliasKey(makeInput);
  const modelKey = aliasKey(modelInput);
  const brand = BRANDS.find((item) => item.aliases.some((alias) => aliasKey(alias) === makeKey));
  const marketName = brand
    ? MARKET_NAMES.find(
        (item) =>
          item.brandId === brand.id &&
          item.aliases.some((alias) => aliasKey(alias) === modelKey),
      )
    : undefined;
  const familyNames = marketName
    ? MARKET_NAMES.filter((item) => item.familyId === marketName.familyId)
        .map((item) => item.names.en)
        .filter((name, index, names) => names.indexOf(name) === index)
    : [];

  return {
    source: "text_alias",
    brandId: brand?.id,
    canonicalMake: brand?.canonicalName ?? unknownCanonicalMake(makeInput),
    modelFamilyId: marketName?.familyId,
    marketNameId: marketName?.id,
    marketRegion: marketName?.region,
    matchStatus: marketName ? "matched_alias" : brand ? "brand_only" : "unmatched",
    makeInput,
    modelInput,
    equivalentMarketNames: familyNames,
  };
}

export function displayVehicleModel(vehicle: Vehicle, locale: Locale): string {
  const marketName = MARKET_NAMES.find((item) => item.id === vehicle.marketNameId);
  return marketName?.names[locale] ?? vehicle.model;
}

export function displayVehicleSpecification(
  vehicle: Pick<Vehicle, "generationId" | "variantId">,
  locale: Locale,
): { generation?: string; variant?: string } {
  return {
    generation: GENERATIONS.find((item) => item.id === vehicle.generationId)?.labels[locale],
    variant: VARIANTS.find((item) => item.id === vehicle.variantId)?.labels[locale],
  };
}

export function canonicalModelTargetId(vehicle: Pick<Vehicle, "make" | "model" | "modelFamilyId">): string {
  if (vehicle.modelFamilyId) return `model-family:${vehicle.modelFamilyId}`;
  return `model:${aliasKey(vehicle.make)}:${aliasKey(vehicle.model)}`;
}

export function canonicalizeLegacyModelTargetId(targetId: string): string {
  if (targetId.startsWith("model-family:")) return targetId;
  const match = /^model:([^:]+):(.+)$/.exec(targetId);
  if (!match) return targetId;
  const identity = resolveVehicleIdentity(match[1] ?? "", match[2] ?? "");
  return identity.modelFamilyId
    ? `model-family:${identity.modelFamilyId}`
    : targetId;
}

export function normalizeVehicle(vehicle: Vehicle): Vehicle {
  const identity = resolveVehicleIdentity(
    vehicle.makeInput ?? vehicle.make,
    vehicle.modelInput ?? vehicle.model,
  );
  const specification = resolveVehicleSpecification(
    identity.modelFamilyId ?? vehicle.modelFamilyId,
    vehicle,
  );
  return {
    ...vehicle,
    make: identity.canonicalMake,
    makeInput: vehicle.makeInput ?? vehicle.make,
    modelInput: vehicle.modelInput ?? vehicle.model,
    brandId: identity.brandId ?? vehicle.brandId,
    modelFamilyId: identity.modelFamilyId ?? vehicle.modelFamilyId,
    generationId: specification.generationId ?? vehicle.generationId ?? identity.generationId,
    variantId: specification.variantId ?? vehicle.variantId,
    marketNameId: identity.marketNameId ?? vehicle.marketNameId,
    marketRegion: identity.marketRegion ?? vehicle.marketRegion,
    identityMatchStatus:
      identity.matchStatus !== "unmatched"
        ? identity.matchStatus
        : vehicle.identityMatchStatus ?? identity.matchStatus,
    specificationMatchStatus:
      specification.matchStatus !== "unmatched"
        ? specification.matchStatus
        : vehicle.specificationMatchStatus ?? specification.matchStatus,
  };
}

export function equivalentMarketNames(modelFamilyId: string, locale: Locale): string[] {
  return MARKET_NAMES.filter((item) => item.familyId === modelFamilyId)
    .map((item) => item.names[locale])
    .filter((name, index, names) => names.indexOf(name) === index);
}

export function relatedVehicleIdentities(
  marketNameId: string | undefined,
  locale: Locale,
): RelatedVehicleIdentity[] {
  if (!marketNameId) return [];

  return MARKET_NAME_RELATIONS.flatMap((relation) => {
    const relatedId = relation.leftMarketNameId === marketNameId
      ? relation.rightMarketNameId
      : relation.rightMarketNameId === marketNameId
        ? relation.leftMarketNameId
        : undefined;
    if (!relatedId) return [];

    const marketName = MARKET_NAMES.find((item) => item.id === relatedId);
    const brand = marketName
      ? BRANDS.find((item) => item.id === marketName.brandId)
      : undefined;
    if (!marketName || !brand) return [];

    return [{
      marketNameId: marketName.id,
      modelFamilyId: marketName.familyId,
      canonicalMake: brand.canonicalName,
      model: marketName.names[locale],
      relationType: relation.relationType,
    }];
  });
}
