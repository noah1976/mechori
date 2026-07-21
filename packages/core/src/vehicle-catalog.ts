import type {
  Locale,
  Vehicle,
  VehicleIdentityMatchStatus,
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
  return {
    ...vehicle,
    make: identity.canonicalMake,
    makeInput: vehicle.makeInput ?? vehicle.make,
    modelInput: vehicle.modelInput ?? vehicle.model,
    brandId: identity.brandId ?? vehicle.brandId,
    modelFamilyId: identity.modelFamilyId ?? vehicle.modelFamilyId,
    generationId: vehicle.generationId ?? identity.generationId,
    marketNameId: identity.marketNameId ?? vehicle.marketNameId,
    marketRegion: identity.marketRegion ?? vehicle.marketRegion,
    identityMatchStatus:
      identity.matchStatus !== "unmatched"
        ? identity.matchStatus
        : vehicle.identityMatchStatus ?? identity.matchStatus,
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
