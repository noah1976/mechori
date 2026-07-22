export const invitationValidityDays = 7;

export function createInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function hashInvitationToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildInvitationUrl(origin: string, rawToken: string): string {
  const url = new URL("/auth", origin);
  url.searchParams.set("mode", "signup");
  url.hash = new URLSearchParams({ invite: rawToken }).toString();
  return url.toString();
}

export function invitationExpiresAt(now = Date.now()): string {
  return new Date(now + invitationValidityDays * 24 * 60 * 60 * 1000).toISOString();
}
