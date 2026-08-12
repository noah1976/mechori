import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  type ServiceProviderOption,
  type ServiceProviderSource,
  type ServiceProviderStatus,
} from "@/lib/service-provider-domain";

export { serviceAttributionFromProvider } from "@/lib/service-provider-domain";
export type { ServiceProviderOption } from "@/lib/service-provider-domain";

interface ServiceProviderRow {
  id: string;
  display_name: string;
  locality: string | null;
  status: ServiceProviderStatus;
  source: ServiceProviderSource;
}

export async function searchServiceProviders(query: string): Promise<ServiceProviderOption[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "search_service_providers",
    { p_query: normalized, p_limit: 20 },
  );
  if (error) throw new Error("service_provider_search_failed");
  return ((data ?? []) as ServiceProviderRow[]).map(serviceProviderFromRow);
}

export async function createUserServiceProvider(
  displayName: string,
  locality?: string,
): Promise<ServiceProviderOption> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "create_user_service_provider",
    { p_display_name: displayName.trim(), p_locality: locality?.trim() || null },
  );
  if (error) throw new Error("service_provider_create_failed");
  const row = ((data ?? []) as ServiceProviderRow[])[0];
  if (!row) throw new Error("service_provider_create_failed");
  return serviceProviderFromRow(row);
}

function serviceProviderFromRow(row: ServiceProviderRow): ServiceProviderOption {
  return {
    id: row.id,
    displayName: row.display_name,
    locality: row.locality ?? undefined,
    status: row.status,
    source: row.source,
  };
}
