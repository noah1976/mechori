import { sanitizeLocalReturnPath } from "@mechori/core";
import { translate } from "@mechori/i18n";

export const alphaInviteCookieName = "mechori_alpha_invite";
const productionOrigin = "https://mechori-alpha.netlify.app";
const deployPreviewHostPattern = /^deploy-preview-\d+--mechori-alpha\.netlify\.app$/;

export function isAllowedMechoriAuthOrigin(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.port === ""
      && (url.origin === productionOrigin || deployPreviewHostPattern.test(url.hostname));
  } catch {
    return false;
  }
}

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

  // Only a known MECHORI origin may become an OAuth callback origin. Preview hosts
  // are accepted only when they match Netlify's numeric deploy-preview convention.
  for (const candidate of [forwardedOrigin, hostOrigin, fallbackOrigin, configuredOrigin]) {
    if (candidate && isAllowedMechoriAuthOrigin(candidate)) return new URL(candidate).origin;
  }

  return productionOrigin;
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
