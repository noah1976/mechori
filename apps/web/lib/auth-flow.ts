import { sanitizeLocalReturnPath } from "@mechori/core";
import { translate } from "@mechori/i18n";

export const alphaInviteCookieName = "mechori_alpha_invite";

export function resolvePublicOrigin({
  fallbackOrigin,
  configuredOrigin,
  forwardedHost,
  forwardedProto,
  host,
}: {
  fallbackOrigin: string;
  configuredOrigin?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}): string {
  const protocol = firstForwardedValue(forwardedProto) || new URL(fallbackOrigin).protocol.slice(0, -1);
  const forwardedOrigin = firstForwardedValue(forwardedHost)
    ? `${protocol}://${firstForwardedValue(forwardedHost)}`
    : undefined;
  const hostOrigin = firstForwardedValue(host)
    ? `${protocol}://${firstForwardedValue(host)}`
    : undefined;

  for (const candidate of [configuredOrigin, forwardedOrigin, hostOrigin, fallbackOrigin]) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
    } catch {
      // Ignore malformed proxy headers and fall back to the request URL.
    }
  }
  return new URL(fallbackOrigin).origin;
}

export function authContinuationUrl(
  origin: string,
  mode: "signin" | "signup",
  returnTo: string,
): string {
  const url = new URL("/auth/start", origin);
  url.searchParams.set("continue", "google");
  url.searchParams.set("mode", mode);
  const safeReturnTo = sanitizeLocalReturnPath(returnTo);
  if (safeReturnTo !== "/") url.searchParams.set("returnTo", safeReturnTo);
  return url.toString();
}

export function alphaAuthErrorMessage(
  code: string | null,
  locale: "ja" | "en",
): string {
  switch (code) {
    case "invitation_required":
      return translate(locale, "alphaMembershipRequired");
    case "invalid_invitation":
      return translate(locale, "invitationInvalid");
    case "expired":
      return translate(locale, "invitationExpired");
    case "revoked":
      return translate(locale, "invitationRevoked");
    case "exhausted":
      return translate(locale, "invitationUsed");
    case "membership_inactive":
      return translate(locale, "membershipInactive");
    case "oauth_failed":
      return translate(locale, "oauthFailed");
    default:
      return "";
  }
}

export function authCallbackUrl(
  origin: string,
  returnTo: string,
  mode: "signin" | "signup" = "signin",
): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("returnTo", sanitizeLocalReturnPath(returnTo));
  url.searchParams.set("mode", mode);
  return url.toString();
}

function firstForwardedValue(value: string | null | undefined): string {
  return value?.split(",")[0]?.trim() ?? "";
}
