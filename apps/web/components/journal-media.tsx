"use client";

import type { JournalMediaAttachment, Locale } from "@mechori/core";
import { ImageIcon, LoaderCircle, RefreshCw, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  alphaSharedJournalMediaBucket,
} from "@/lib/alpha-shared-journals";
import { journalMediaStore } from "@/lib/media-store";
import {
  createSharedMediaLoadDiagnostic,
  isSharedMediaServerProbe,
  type SharedMediaLoadDiagnostic,
} from "@/lib/shared-media-diagnostics";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const reportedMediaDiagnostics = new Set<string>();

export function JournalMedia({
  attachments,
  locale,
  compact = false,
  body = false,
  priority = false,
  vehicleHref,
}: {
  attachments: JournalMediaAttachment[];
  locale: Locale;
  compact?: boolean;
  body?: boolean;
  priority?: boolean;
  vehicleHref?: string;
}) {
  if (attachments.length === 0) return null;
  const visibleAttachments = compact ? attachments.slice(0, 1) : attachments;

  return (
    <div className={compact ? "journal-media compact" : body ? "journal-media body" : "journal-media"}>
      {visibleAttachments.map((attachment, index) => (
        <JournalMediaItem
          attachment={attachment}
          body={body}
          locale={locale}
          priority={priority && index === 0}
          vehicleHref={vehicleHref}
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
  body,
  locale,
  priority,
  vehicleHref,
}: {
  attachment: JournalMediaAttachment;
  body: boolean;
  locale: Locale;
  priority: boolean;
  vehicleHref?: string;
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
  const [failureId, setFailureId] = useState<string | null>(null);
  const [probeCode, setProbeCode] = useState<string | null>(null);
  const [aspectClass, setAspectClass] = useState<"unknown" | "portrait" | "square" | "landscape">("unknown");

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
    void blobPromise.then((result) => {
      if (!active) return;
      if (result.blob) {
        objectUrl = URL.createObjectURL(result.blob);
        setSource(objectUrl);
      } else if (result.diagnostic) {
        setFailureId(result.diagnostic.errorId);
        void reportSharedMediaDiagnostic(
          result.diagnostic,
          attachment.assetPath,
        ).then((code) => {
          if (active && code) setProbeCode(code);
        });
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
        {sharedPhotoUnavailable && failureId && (
          <small>{locale === "ja" ? `確認番号: ${failureId}` : `Reference: ${failureId}`}</small>
        )}
        {sharedPhotoUnavailable && probeCode && (
          <small>{locale === "ja" ? `診断コード: ${probeCode}` : `Diagnostic: ${probeCode}`}</small>
        )}
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

  const image = attachment.kind === "image" ? body ? (
    // Body images need their intrinsic ratio; compact cards intentionally keep their fixed thumbnail layout.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={attachment.altText}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={(event) => {
        const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
        setAspectClass(ratio < 0.85 ? "portrait" : ratio > 1.35 ? "landscape" : "square");
      }}
    />
  ) : (
    <Image
      src={source}
      alt={attachment.altText}
      fill
      sizes="(max-width: 760px) 100vw, 820px"
      unoptimized
      priority={priority}
    />
  ) : null;
  return (
    <figure className={`journal-media-item${body ? ` body-${aspectClass}` : ""}`}>
      {image ? (
        vehicleHref ? <Link href={vehicleHref} aria-label={locale === "ja" ? "車両プロフィールを開く" : "Open vehicle profile"}>{image}</Link> : image
      ) : (
        <video controls preload="metadata" aria-label={attachment.altText}>
          <source src={source} type={attachment.mimeType} />
        </video>
      )}
      {body && attachment.altText.trim() && (
        <figcaption className="journal-media-caption">{attachment.altText}</figcaption>
      )}
      {!attachment.isDemo && attachment.source === "local_blob" && (
        body ? (
          <small className="journal-media-privacy-caption">
            {attachment.privacyState === "public_ready"
              ? locale === "ja"
                ? "記録と同じ範囲で公開"
                : "Shared with the record audience"
              : locale === "ja"
                ? "非公開メディア"
                : "Private media"}
          </small>
        ) : (
          <figcaption>
            {attachment.privacyState === "public_ready"
              ? locale === "ja"
                ? "記録と同じ範囲で公開"
                : "Shared with the record audience"
              : locale === "ja"
                ? "非公開メディア"
                : "Private media"}
          </figcaption>
        )
      )}
    </figure>
  );
}

async function loadJournalMediaBlob(
  attachment: JournalMediaAttachment,
): Promise<{ blob: Blob | null; diagnostic: SharedMediaLoadDiagnostic | null }> {
  if (attachment.source === "local_blob" && attachment.storageKey) {
    return { blob: await journalMediaStore.load(attachment.storageKey), diagnostic: null };
  }
  if (attachment.source !== "alpha_shared" || !attachment.assetPath) {
    return { blob: null, diagnostic: null };
  }

  const supabase = createSupabaseBrowserClient();
  const storage = supabase.storage.from(
    alphaSharedJournalMediaBucket,
  );
  const session = await supabase.auth.getSession();
  let lastError: unknown = { code: "empty_storage_response" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await storage.download(attachment.assetPath);
    if (!result.error && result.data) {
      return { blob: result.data, diagnostic: null };
    }
    lastError = result.error ?? lastError;
    if (attempt === 0) await wait(650);
  }
  return {
    blob: null,
    diagnostic: await createSharedMediaLoadDiagnostic({
      photoId: attachment.id,
      bucket: alphaSharedJournalMediaBucket,
      objectPath: attachment.assetPath,
      error: lastError,
      sessionPresent: Boolean(session.data.session),
      attempts: 2,
    }),
  };
}

async function reportSharedMediaDiagnostic(
  diagnostic: SharedMediaLoadDiagnostic,
  objectPath: string | undefined,
): Promise<string | null> {
  if (!objectPath || reportedMediaDiagnostics.has(diagnostic.errorId)) return null;
  reportedMediaDiagnostics.add(diagnostic.errorId);
  try {
    const response = await fetch("/api/media-diagnostics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ diagnostic, objectPath }),
      keepalive: true,
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const probe = (payload as Record<string, unknown>).probe;
    return isSharedMediaServerProbe(probe) ? probe.probeCode : null;
  } catch {
    // The short reference remains visible even when diagnostic delivery fails.
    return null;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
