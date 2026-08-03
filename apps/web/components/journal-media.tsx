"use client";

import type { JournalMediaAttachment, Locale } from "@mechori/core";
import { ImageIcon, LoaderCircle, Video } from "lucide-react";
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
          key={attachment.id}
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

  useEffect(() => {
    if (
      attachment.source !== "local_blob" &&
      attachment.source !== "alpha_shared"
    ) {
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    const blobPromise =
      attachment.source === "local_blob" && attachment.storageKey
        ? journalMediaStore.load(attachment.storageKey)
        : attachment.source === "alpha_shared" && attachment.assetPath
          ? createSupabaseBrowserClient()
              .storage
              .from(alphaSharedJournalMediaBucket)
              .download(attachment.assetPath)
              .then((result: { data: Blob | null; error: unknown }) => {
                if (result.error) return null;
                return result.data;
              })
          : Promise.resolve(null);
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
  }, [attachment.assetPath, attachment.source, attachment.storageKey]);

  if (loading) {
    return (
      <div className="journal-media-placeholder" role="status">
        <LoaderCircle className="spin" size={22} aria-hidden="true" />
        {locale === "ja" ? "メディアを読み込み中" : "Loading media"}
      </div>
    );
  }

  if (!source) {
    return (
      <div className="journal-media-placeholder">
        {attachment.kind === "image" ? (
          <ImageIcon size={22} aria-hidden="true" />
        ) : (
          <Video size={22} aria-hidden="true" />
        )}
        {attachment.source === "alpha_shared"
          ? locale === "ja"
            ? "共有写真を読み込めません"
            : "Shared photo is unavailable"
          : locale === "ja"
            ? "端末内メディアが見つかりません"
            : "Local media not found"}
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
              ? "公開確認済み画像"
              : "Confirmed for sharing"
            : locale === "ja"
              ? "端末内保存・非公開メディア"
              : "Stored on this device · private media"}
        </figcaption>
      )}
    </figure>
  );
}
