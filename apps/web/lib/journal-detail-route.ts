import type { GarageJournalPost } from "@mechori/core";

export type SharedJournalLoadState = "idle" | "loading" | "ready" | "error";

export function journalDetailHref(journalId: string, returnTo?: "/" | "/feed"): string {
  const href = `/journal/${encodeURIComponent(journalId)}`;
  return returnTo ? `${href}?from=${encodeURIComponent(returnTo)}` : href;
}

export function journalReturnHref(
  from: string | null,
  signedIn: boolean,
): "/" | "/feed" {
  if (from === "/") return "/";
  return signedIn ? "/feed" : "/";
}

export function journalDetailAvailability({
  hydrated,
  isRemoteAlpha,
  signedIn,
  workspaceLoadState,
  localJournal,
  sharedJournal,
  sharedLoadState,
}: {
  hydrated: boolean;
  isRemoteAlpha: boolean;
  signedIn: boolean;
  workspaceLoadState?: "loading" | "ready" | "error";
  localJournal?: GarageJournalPost;
  sharedJournal?: GarageJournalPost;
  sharedLoadState: SharedJournalLoadState;
}): "loading" | "ready" | "retryable_error" | "missing" {
  if (!hydrated) return "loading";
  if (localJournal || sharedJournal) return "ready";

  if (isRemoteAlpha && signedIn && workspaceLoadState === "loading") return "loading";
  if (isRemoteAlpha && signedIn && workspaceLoadState === "error") return "retryable_error";

  // Shared alpha posts live outside the private workspace and arrive separately.
  if (isRemoteAlpha && signedIn && sharedLoadState === "loading") return "loading";
  if (isRemoteAlpha && signedIn && sharedLoadState === "error") return "retryable_error";

  return "missing";
}
