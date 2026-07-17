export const supportedUiLocales = ["ja", "en"] as const;

export type SupportedUiLocale = (typeof supportedUiLocales)[number];

/** A canonical BCP 47 tag such as `it`, `de-DE`, or `pt-BR`. */
export type LanguageTag = string;

export const defaultUiLocale: SupportedUiLocale = "ja";

export function normalizeLanguageTag(value: unknown): LanguageTag | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replaceAll("_", "-");
  if (!candidate) return null;

  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? null;
  } catch {
    return null;
  }
}

export function isSupportedUiLocale(value: unknown): value is SupportedUiLocale {
  const normalized = normalizeLanguageTag(value);
  if (!normalized) return false;
  return supportedUiLocales.some(
    (locale) => locale.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  );
}

export function resolveSupportedUiLocale(
  value: unknown,
  fallback: SupportedUiLocale = defaultUiLocale,
): SupportedUiLocale {
  const normalized = normalizeLanguageTag(value);
  if (!normalized) return fallback;

  const exact = supportedUiLocales.find(
    (locale) => locale.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  );
  if (exact) return exact;

  const baseLanguage = normalized.split("-")[0]?.toLocaleLowerCase();
  return (
    supportedUiLocales.find(
      (locale) => locale.split("-")[0]?.toLocaleLowerCase() === baseLanguage,
    ) ?? fallback
  );
}
