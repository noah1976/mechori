import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getMechoriRuntime,
  getSupabasePublicConfig,
} from "@/lib/runtime-config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (getMechoriRuntime() !== "alpha") return response;

  const config = getSupabasePublicConfig();
  if (!config) return serviceUnavailable();

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

function serviceUnavailable() {
  return new NextResponse("Alpha environment is not configured.", {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
