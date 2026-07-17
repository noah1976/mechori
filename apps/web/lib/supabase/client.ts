import { createBrowserClient } from "@supabase/ssr";
import { requireAlphaSupabaseConfig } from "@/lib/runtime-config";

export function createSupabaseBrowserClient() {
  const config = requireAlphaSupabaseConfig();
  return createBrowserClient(config.url, config.publishableKey);
}
