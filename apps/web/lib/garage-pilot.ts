import type { Locale, MaintenanceServiceAttributionV1 } from "@mechori/core";

/** Keeps the Garage timeline concise while retaining who performed maintenance. */
export function garageServiceAttributionLabel(
  attribution: MaintenanceServiceAttributionV1 | undefined,
  locale: Locale,
): string | null {
  if (!attribution || attribution.performedByType === "unknown") return null;
  if (attribution.performedByType === "self") {
    return locale === "ja" ? "自分で作業" : "DIY";
  }

  const provider = attribution.providerDisplayNameSnapshot?.trim();
  if (!provider) return null;
  const locality = attribution.providerLocalitySnapshot?.trim();
  return locality ? `${provider} · ${locality}` : provider;
}
