"use client";

import type { JournalMediaAttachment, Locale } from "@mechori/core";
import { ImageIcon, LoaderCircle, Video } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { journalMediaStore } from "@/lib/media-store";

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
          priority={priority || (!compact && index === 0)}
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
  const [loading, setLoading] = useState(attachment.source === "local_blob");

  useEffect(() => {
    if (attachment.source !== "local_blob" || !attachment.storageKey) return;
    let active = true;
    let objectUrl: string | undefined;
    void journalMediaStore.load(attachment.storageKey).then((blob) => {
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
  }, [attachment.source, attachment.storageKey]);

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
        {locale === "ja" ? "端末内メディアが見つかりません" : "Local media not found"}
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
          {locale === "ja" ? "端末内保存・非公開メディア" : "Stored on this device · private media"}
        </figcaption>
      )}
    </figure>
  );
}
