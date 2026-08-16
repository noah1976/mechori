import type { CookieOptions } from "@supabase/ssr";

type AuthCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type RequestCookieStore = {
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string): unknown;
};

type ResponseCookieStore = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

type AuthRouteResponse = {
  cookies: ResponseCookieStore;
  headers: Headers;
};

/**
 * Keeps Supabase cookie mutations visible to the rest of a callback request,
 * then commits the same mutations to the eventual redirect response.
 */
export function createAuthRouteCookieBridge(requestCookies: RequestCookieStore) {
  const pendingCookies: AuthCookie[] = [];
  const pendingHeaders = new Headers();

  return {
    cookies: {
      getAll: () => requestCookies.getAll(),
      setAll(cookiesToSet: AuthCookie[], headers: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) => requestCookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
        Object.entries(headers).forEach(([name, value]) => pendingHeaders.set(name, value));
      },
    },
    applyTo(response: AuthRouteResponse) {
      pendingCookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
      pendingHeaders.forEach((value, name) => response.headers.set(name, value));
      return response;
    },
  };
}
