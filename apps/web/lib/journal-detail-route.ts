import type { GarageJournalPost } from "@mechori/core";

export type SharedJournalLoadState = "idle" | "loading" | "ready" | "error";

export function journalDetailHref(journalId: string): string {
  return `/journal/${encodeURIComponent(journalId)}`;
}

export function journalDetailAvailability({
  hydrated,
  isRemoteAlpha,
  signedIn,
  localJournal,
  sharedJournal,
  sharedLoadState,
}: {
  hydrated: boolean;
  isRemoteAlpha: boolean;
  signedIn: boolean;
  localJournal?: GarageJournalPost;
  sharedJournal?: GarageJournalPost;
  sharedLoadState: SharedJournalLoadState;
}): "loading" | "ready" | "retryable_error" | "missing" {
  if (!hydrated) return "loading";
  if (localJournal || sharedJournal) return "ready";

  // Shared alpha posts live outside the private workspace and arrive separately.
  if (isRemoteAlpha && signedIn && sharedLoadState === "loading") return "loading";
  if (isRemoteAlpha && signedIn && sharedLoadState === "error") return "retryable_error";

  return "missing";
}
