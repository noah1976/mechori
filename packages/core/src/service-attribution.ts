import type {
  JournalEventType,
  MaintenanceServiceAttributionV1,
} from "./types.ts";

export const unknownServiceAttribution = (): MaintenanceServiceAttributionV1 => ({
  version: 1,
  performedByType: "unknown",
});

export function normalizeServiceAttribution(
  value: unknown,
): MaintenanceServiceAttributionV1 {
  if (!value || typeof value !== "object") return unknownServiceAttribution();
  const source = value as Partial<MaintenanceServiceAttributionV1>;
  if (source.version !== 1) return unknownServiceAttribution();
  if (source.performedByType === "self") {
    return { version: 1, performedByType: "self" };
  }
  if (
    source.performedByType === "service_provider" &&
    typeof source.serviceProviderId === "string" &&
    source.serviceProviderId.trim() &&
    typeof source.providerDisplayNameSnapshot === "string" &&
    source.providerDisplayNameSnapshot.trim() &&
    source.providerDisplayNameSnapshot.trim().length <= 120
  ) {
    const locality = typeof source.providerLocalitySnapshot === "string"
      ? source.providerLocalitySnapshot.trim()
      : "";
    if (locality.length > 120) return unknownServiceAttribution();
    return {
      version: 1,
      performedByType: "service_provider",
      serviceProviderId: source.serviceProviderId.trim(),
      providerDisplayNameSnapshot: source.providerDisplayNameSnapshot.trim(),
      ...(locality ? { providerLocalitySnapshot: locality } : {}),
    };
  }
  return unknownServiceAttribution();
}

export function isValidServiceAttribution(
  value: MaintenanceServiceAttributionV1,
): boolean {
  if (value.version !== 1) return false;
  if (value.performedByType === "self" || value.performedByType === "unknown") {
    return true;
  }
  return Boolean(
    value.serviceProviderId?.trim() &&
      value.providerDisplayNameSnapshot?.trim() &&
      value.providerDisplayNameSnapshot.trim().length <= 120 &&
      (!value.providerLocalitySnapshot || value.providerLocalitySnapshot.trim().length <= 120),
  );
}

const maintenanceJournalTypes = new Set<JournalEventType>([
  "inspection",
  "tire",
  "oil",
  "breakdown",
  "repair",
  "part",
]);

export function journalSupportsServiceAttribution(eventType?: JournalEventType): boolean {
  return eventType !== undefined && maintenanceJournalTypes.has(eventType);
}
