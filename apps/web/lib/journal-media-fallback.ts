import type { JournalMediaAttachment, Locale } from "@mechori/core";

export type JournalMediaFallbackKind = "local" | "shared" | "other";

export interface JournalMediaFallback {
  kind: JournalMediaFallbackKind;
  message: string;
  detail?: string;
}

export function journalMediaFallback(
  attachment: Pick<JournalMediaAttachment, "source">,
  locale: Locale,
): JournalMediaFallback {
  if (attachment.source === "alpha_shared") {
    return {
      kind: "shared",
      message: locale === "ja" ? "共有写真を読み込めません" : "Shared photo is unavailable",
    };
  }

  if (attachment.source === "local_blob") {
    return {
      kind: "local",
      message: locale === "ja"
        ? "この写真はこの端末で確認できません"
        : "This photo is unavailable on this device",
      detail: locale === "ja"
        ? "記録本文はそのまま残っています"
        : "The record text is still available.",
    };
  }

  return {
    kind: "other",
    message: locale === "ja" ? "写真を読み込めません" : "Photo is unavailable",
  };
}
