import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { requireAlphaSupabaseConfig } from "@/lib/runtime-config";
import { createAuthRouteCookieBridge } from "@/lib/supabase/auth-route-cookies";

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

export function createSupabaseRouteClient(request: NextRequest) {
  const config = requireAlphaSupabaseConfig();
  const cookieBridge = createAuthRouteCookieBridge(request.cookies);
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: cookieBridge.cookies,
  });

  return {
    supabase,
    applyTo(response: NextResponse) {
      return cookieBridge.applyTo(response);
    },
  };
}
