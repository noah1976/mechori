import type { MaintenanceServiceAttributionV1 } from "@mechori/core";

export type ServiceProviderStatus = "unverified" | "active" | "inactive";
export type ServiceProviderSource = "user_submitted" | "admin_created";

export interface ServiceProviderOption {
  id: string;
  displayName: string;
  locality?: string;
  status: ServiceProviderStatus;
  source: ServiceProviderSource;
}

export function serviceAttributionFromProvider(
  provider: ServiceProviderOption,
): MaintenanceServiceAttributionV1 {
  return {
    version: 1,
    performedByType: "service_provider",
    serviceProviderId: provider.id,
    providerDisplayNameSnapshot: provider.displayName,
    ...(provider.locality ? { providerLocalitySnapshot: provider.locality } : {}),
  };
}
