export type AuthProvider = "google" | "apple" | "facebook" | "x" | "email_magic_link";

export type AuthSession =
  | { status: "signed_out" }
  | {
      status: "signed_in";
      provider: AuthProvider;
      profileId: string;
      authenticatedAt: string;
    };

export const signedOutSession: AuthSession = { status: "signed_out" };

const localReturnBase = "https://mechori.local";

export function createAuthSession(
  provider: AuthProvider,
  profileId: string,
  authenticatedAt = new Date().toISOString(),
): AuthSession {
  if (!profileId.trim()) throw new Error("profile_id_required");
  return { status: "signed_in", provider, profileId, authenticatedAt };
}

export function parseAuthSession(input: unknown): AuthSession | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (value.status === "signed_out") return signedOutSession;
  if (
    value.status !== "signed_in" ||
    !isAuthProvider(value.provider) ||
    typeof value.profileId !== "string" ||
    !value.profileId.trim() ||
    typeof value.authenticatedAt !== "string" ||
    !value.authenticatedAt
  ) {
    return null;
  }
  return {
    status: "signed_in",
    provider: value.provider,
    profileId: value.profileId,
    authenticatedAt: value.authenticatedAt,
  };
}

export function parseStoredAuthSession(raw: string | null): AuthSession {
  if (raw === null) return signedOutSession;
  try {
    return parseAuthSession(JSON.parse(raw)) ?? signedOutSession;
  } catch {
    return signedOutSession;
  }
}

export function isSignedIn(
  session: AuthSession,
): session is Extract<AuthSession, { status: "signed_in" }> {
  return session.status === "signed_in";
}

export function sanitizeLocalReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/";
  }

  try {
    const url = new URL(value, localReturnBase);
    if (
      url.origin !== localReturnBase ||
      url.pathname === "/auth" ||
      url.pathname.startsWith("/auth/")
    ) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function isAuthProvider(value: unknown): value is AuthProvider {
  return ["google", "apple", "facebook", "x", "email_magic_link"].includes(
    String(value),
  );
}
