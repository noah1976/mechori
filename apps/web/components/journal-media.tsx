"use client";

import type { JournalMediaAttachment, Locale } from "@mechori/core";
import { ImageIcon, LoaderCircle, RefreshCw, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  alphaSharedJournalMediaBucket,
} from "@/lib/alpha-shared-journals";
import { journalMediaStore } from "@/lib/media-store";
import {
  createSharedMediaLoadDiagnostic,
  describeSharedMediaBlob,
  isSharedMediaServerProbe,
  type SharedMediaBlobMetadata,
  type SharedMediaLoadDiagnostic,
} from "@/lib/shared-media-diagnostics";
import { downloadSharedMediaWithRetry } from "@/lib/shared-media-download";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { journalMediaFallback } from "@/lib/journal-media-fallback";

const reportedMediaDiagnostics = new Set<string>();

export function JournalMedia({
  attachments,
  locale,
  compact = false,
  body = false,
  priority = false,
  linkHref,
  linkAriaLabel,
}: {
  attachments: JournalMediaAttachment[];
  locale: Locale;
  compact?: boolean;
  body?: boolean;
  priority?: boolean;
  linkHref?: string;
  linkAriaLabel?: string;
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
          linkHref={linkHref}
          linkAriaLabel={linkAriaLabel}
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
  linkHref,
  linkAriaLabel,
}: {
  attachment: JournalMediaAttachment;
  body: boolean;
  locale: Locale;
  priority: boolean;
  linkHref?: string;
  linkAriaLabel?: string;
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
  const [sharedSessionPresent, setSharedSessionPresent] = useState(false);
  const [sharedBlobMetadata, setSharedBlobMetadata] = useState<SharedMediaBlobMetadata | null>(null);
  const [aspectClass, setAspectClass] = useState<"unknown" | "portrait" | "square" | "landscape">("unknown");
  const objectUrlRef = useRef<string | null>(null);
  const showSharedMediaDiagnostic = useCallback((diagnostic: SharedMediaLoadDiagnostic) => {
    setFailureId(diagnostic.errorId);
    void reportSharedMediaDiagnostic(
      diagnostic,
      attachment.assetPath,
    ).then((code) => {
      if (code) setProbeCode(code);
    });
  }, [attachment.assetPath]);
  const markUnavailable = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSource(null);
    setLoading(false);
    if (attachment.source !== "alpha_shared" || !attachment.assetPath) return;
    void createSharedMediaLoadDiagnostic({
      photoId: attachment.id,
      bucket: alphaSharedJournalMediaBucket,
      objectPath: attachment.assetPath,
      error: { code: "image_decode_or_render_failed" },
      sessionPresent: sharedSessionPresent,
      attempts: Math.min(loadAttempt + 1, 4),
      stage: "image_decode",
      blob: sharedBlobMetadata,
    }).then(showSharedMediaDiagnostic);
  };

  useEffect(() => {
    if (
      attachment.source !== "local_blob" &&
      attachment.source !== "alpha_shared"
    ) {
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    void loadJournalMediaBlob(attachment)
      .then((result) => {
        if (!active) return;
        if (result.blob) {
          try {
            objectUrl = URL.createObjectURL(result.blob);
            objectUrlRef.current = objectUrl;
            setSharedSessionPresent(result.sessionPresent);
            setSharedBlobMetadata(result.blobMetadata);
            setSource(objectUrl);
          } catch (error) {
            if (attachment.source === "alpha_shared" && attachment.assetPath) {
              void createSharedMediaLoadDiagnostic({
                photoId: attachment.id,
                bucket: alphaSharedJournalMediaBucket,
                objectPath: attachment.assetPath,
                error,
                sessionPresent: result.sessionPresent,
                attempts: result.attempts,
                stage: "blob_url",
                blob: result.blobMetadata,
              }).then(showSharedMediaDiagnostic);
            }
          }
        } else if (result.diagnostic) {
          showSharedMediaDiagnostic(result.diagnostic);
        }
      })
      .catch(() => {
        // Local media can be unavailable after a browser reset or on another origin.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (objectUrlRef.current === objectUrl) objectUrlRef.current = null;
    };
  }, [attachment, loadAttempt, showSharedMediaDiagnostic]);

  if (loading) {
    return (
      <div className="journal-media-placeholder" role="status">
        <LoaderCircle className="spin" size={22} aria-hidden="true" />
        {locale === "ja" ? "メディアを読み込み中" : "Loading media"}
      </div>
    );
  }

  if (!source) {
    const fallback = journalMediaFallback(attachment, locale);
    const sharedPhotoUnavailable = fallback.kind === "shared";
    return (
      <div className={`journal-media-placeholder${fallback.kind === "local" ? " is-local-unavailable" : ""}`}>
        {attachment.kind === "image" ? (
          <ImageIcon size={22} aria-hidden="true" />
        ) : (
          <Video size={22} aria-hidden="true" />
        )}
        <span>{fallback.message}</span>
        {fallback.detail && <small>{fallback.detail}</small>}
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
              setFailureId(null);
              setProbeCode(null);
              setSharedBlobMetadata(null);
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
      onError={attachment.source === "alpha_shared" ? markUnavailable : undefined}
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
      onError={attachment.source === "alpha_shared" ? markUnavailable : undefined}
    />
  ) : null;
  return (
    <figure className={`journal-media-item${body ? ` body-${aspectClass}` : ""}`}>
      {image ? (
        linkHref ? <Link href={linkHref} aria-label={linkAriaLabel}>{image}</Link> : image
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
): Promise<{
  blob: Blob | null;
  diagnostic: SharedMediaLoadDiagnostic | null;
  sessionPresent: boolean;
  attempts: number;
  blobMetadata: SharedMediaBlobMetadata | null;
}> {
  if (attachment.source === "local_blob" && attachment.storageKey) {
    return {
      blob: await journalMediaStore.load(attachment.storageKey),
      diagnostic: null,
      sessionPresent: false,
      attempts: 1,
      blobMetadata: null,
    };
  }
  if (attachment.source !== "alpha_shared" || !attachment.assetPath) {
    return { blob: null, diagnostic: null, sessionPresent: false, attempts: 1, blobMetadata: null };
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const storage = supabase.storage.from(alphaSharedJournalMediaBucket);
    const session = await supabase.auth.getSession();
    const sessionPresent = Boolean(session.data.session);
    const result = await downloadSharedMediaWithRetry({
      attempts: 2,
      download: () => storage.download(attachment.assetPath),
      wait: () => wait(650),
    });
    if (result.blob) {
      const blobMetadata = describeSharedMediaBlob(result.blob);
      if (blobMetadata.byteLength > 0) {
        return {
          blob: result.blob,
          diagnostic: null,
          sessionPresent,
          attempts: result.attempts,
          blobMetadata,
        };
      }
      return sharedMediaLoadFailure({
        attachment,
        objectPath: attachment.assetPath,
        error: { code: "zero_byte_blob" },
        sessionPresent,
        attempts: result.attempts,
        stage: "blob_validation",
        blobMetadata,
      });
    }
    return sharedMediaLoadFailure({
      attachment,
      objectPath: attachment.assetPath,
      error: result.error,
      sessionPresent,
      attempts: result.attempts,
      stage: result.failureKind === "transport" ? "download_transport" : "authenticated_download",
    });
  } catch (error) {
    return sharedMediaLoadFailure({
      attachment,
      objectPath: attachment.assetPath,
      error,
      sessionPresent: false,
      attempts: 1,
      stage: "download_transport",
    });
  }
}

async function sharedMediaLoadFailure(input: {
  attachment: JournalMediaAttachment;
  objectPath: string;
  error: unknown;
  sessionPresent: boolean;
  attempts: number;
  stage: "authenticated_download" | "download_transport" | "blob_validation";
  blobMetadata?: SharedMediaBlobMetadata;
}): Promise<{
  blob: null;
  diagnostic: SharedMediaLoadDiagnostic;
  sessionPresent: boolean;
  attempts: number;
  blobMetadata: SharedMediaBlobMetadata | null;
}> {
  const { attachment } = input;
  return {
    blob: null,
    diagnostic: await createSharedMediaLoadDiagnostic({
      photoId: attachment.id,
      bucket: alphaSharedJournalMediaBucket,
      objectPath: input.objectPath,
      error: input.error,
      sessionPresent: input.sessionPresent,
      attempts: input.attempts,
      stage: input.stage,
      blob: input.blobMetadata,
    }),
    sessionPresent: input.sessionPresent,
    attempts: input.attempts,
    blobMetadata: input.blobMetadata ?? null,
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
