"use client";

/* Signed private Storage URLs are rendered natively instead of through Next's image proxy. */
/* eslint-disable @next/next/no-img-element */

import { alphaProfileImageBucket } from "@/lib/alpha-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function ProfileAvatar({
  displayName,
  imagePath,
  className = "profile-avatar",
}: {
  displayName: string;
  imagePath?: string;
  className?: string;
}) {
  if (!imagePath) {
    return <ProfileAvatarFallback displayName={displayName} className={className} />;
  }
  return (
    <ProfileAvatarImage
      key={imagePath}
      displayName={displayName}
      imagePath={imagePath}
      className={className}
    />
  );
}

function ProfileAvatarImage({
  displayName,
  imagePath,
  className,
}: {
  displayName: string;
  imagePath: string;
  className: string;
}) {
  const [source, setSource] = useState<string | null>(() => cachedUrl(imagePath));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (source) return;

    void createSupabaseBrowserClient()
      .storage
      .from(alphaProfileImageBucket)
      .createSignedUrl(imagePath, 5 * 60)
      .then((result: { data: { signedUrl: string } | null; error: unknown }) => {
        if (!active) return;
        if (result.error || !result.data?.signedUrl) {
          setFailed(true);
          return;
        }
        signedUrlCache.set(imagePath, {
          url: result.data.signedUrl,
          expiresAt: Date.now() + 4 * 60 * 1000,
        });
        setSource(result.data.signedUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [imagePath, source]);

  // A native image lets the browser request the refreshed signed URL directly.
  return (
    <span className={className} aria-hidden="true">
      {source && !failed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <ProfileAvatarInitial displayName={displayName} />
      )}
    </span>
  );
}

function ProfileAvatarFallback({
  displayName,
  className,
}: {
  displayName: string;
  className: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      <ProfileAvatarInitial displayName={displayName} />
    </span>
  );
}

function ProfileAvatarInitial({ displayName }: { displayName: string }) {
  return displayName.slice(0, 1).toLocaleUpperCase();
}

function cachedUrl(imagePath?: string): string | null {
  if (!imagePath) return null;
  const cached = signedUrlCache.get(imagePath);
  if (!cached || cached.expiresAt <= Date.now()) {
    signedUrlCache.delete(imagePath);
    return null;
  }
  return cached.url;
}
