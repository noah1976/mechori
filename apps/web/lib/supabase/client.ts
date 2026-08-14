import { createBrowserClient } from "@supabase/ssr";
import { requireAlphaSupabaseConfig } from "@/lib/runtime-config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const config = requireAlphaSupabaseConfig();
  browserClient = createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
