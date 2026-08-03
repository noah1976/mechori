"use client";

import type { JournalMediaAttachment, Locale } from "@mechori/core";
import { ImageIcon, LoaderCircle, RefreshCw, Video } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  alphaSharedJournalMediaBucket,
} from "@/lib/alpha-shared-journals";
import { journalMediaStore } from "@/lib/media-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function JournalMedia({
  attachments,
  locale,
  compact = false,
  priority = false,
}: {
  attachments: JournalMediaAttachment[];
  locale: Locale;
  compact?: boolean;
  priority?: boolean;
}) {
  if (attachments.length === 0) return null;
  const visibleAttachments = compact ? attachments.slice(0, 1) : attachments;

  return (
    <div className={compact ? "journal-media compact" : "journal-media"}>
      {visibleAttachments.map((attachment, index) => (
        <JournalMediaItem
          attachment={attachment}
          locale={locale}
          priority={priority && index === 0}
          key={`${attachment.id}:${attachment.source}:${attachment.assetPath ?? attachment.storageKey ?? ""}`}
        />
      ))}
      {compact && attachments.length > 1 && (
        <span className="journal-media-count">+{attachments.length - 1}</span>
      )}
    </div>
  );
}

function JournalMediaItem({
  attachment,
  locale,
  priority,
}: {
  attachment: JournalMediaAttachment;
  locale: Locale;
  priority: boolean;
}) {
  const [source, setSource] = useState<string | null>(
    attachment.source === "demo_asset" || attachment.source === "alpha_inline"
      ? attachment.assetPath ?? null
      : null,
  );
  const [loading, setLoading] = useState(
    attachment.source === "local_blob" || attachment.source === "alpha_shared",
  );
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (
      attachment.source !== "local_blob" &&
      attachment.source !== "alpha_shared"
    ) {
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    const blobPromise = loadJournalMediaBlob(attachment);
    void blobPromise.then((blob: Blob | null) => {
      if (!active) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      }
      setLoading(false);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, loadAttempt]);

  if (loading) {
    return (
      <div className="journal-media-placeholder" role="status">
        <LoaderCircle className="spin" size={22} aria-hidden="true" />
        {locale === "ja" ? "メディアを読み込み中" : "Loading media"}
      </div>
    );
  }

  if (!source) {
    const sharedPhotoUnavailable = attachment.source === "alpha_shared";
    return (
      <div className="journal-media-placeholder">
        {attachment.kind === "image" ? (
          <ImageIcon size={22} aria-hidden="true" />
        ) : (
          <Video size={22} aria-hidden="true" />
        )}
        <span>{sharedPhotoUnavailable
          ? locale === "ja"
            ? "共有写真を読み込めません"
            : "Shared photo is unavailable"
          : locale === "ja"
            ? "端末内メディアが見つかりません"
            : "Local media not found"}</span>
        {sharedPhotoUnavailable && (
          <button
            type="button"
            className="journal-media-retry"
            onClick={() => {
              setLoading(true);
              setLoadAttempt((current) => current + 1);
            }}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {locale === "ja" ? "再読み込み" : "Try again"}
          </button>
        )}
      </div>
    );
  }

  return (
    <figure className="journal-media-item">
      {attachment.kind === "image" ? (
        <Image
          src={source}
          alt={attachment.altText}
          fill
          sizes="(max-width: 760px) 100vw, 820px"
          unoptimized
          priority={priority}
        />
      ) : (
        <video controls preload="metadata" aria-label={attachment.altText}>
          <source src={source} type={attachment.mimeType} />
        </video>
      )}
      {!attachment.isDemo && attachment.source === "local_blob" && (
        <figcaption>
          {attachment.privacyState === "public_ready"
            ? locale === "ja"
              ? "記録と同じ範囲で公開"
              : "Shared with the record audience"
            : locale === "ja"
              ? "非公開メディア"
              : "Private media"}
        </figcaption>
      )}
    </figure>
  );
}

async function loadJournalMediaBlob(
  attachment: JournalMediaAttachment,
): Promise<Blob | null> {
  if (attachment.source === "local_blob" && attachment.storageKey) {
    return journalMediaStore.load(attachment.storageKey);
  }
  if (attachment.source !== "alpha_shared" || !attachment.assetPath) {
    return null;
  }

  const storage = createSupabaseBrowserClient().storage.from(
    alphaSharedJournalMediaBucket,
  );
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await storage.download(attachment.assetPath);
    if (!result.error && result.data) return result.data;
    if (attempt === 0) await wait(650);
  }
  return null;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
