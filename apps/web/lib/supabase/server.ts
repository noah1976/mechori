import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAlphaSupabaseConfig } from "@/lib/runtime-config";

export async function createSupabaseServerClient() {
  const config = requireAlphaSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes them.
        }
      },
    },
  });
}
