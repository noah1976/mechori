"use client";

/* Private profile images are fetched through the authenticated browser client. */
/* eslint-disable @next/next/no-img-element */

import { alphaProfileImageBucket } from "@/lib/alpha-profile";
import {
  getAvatarCacheSnapshot,
  getAvatarObjectUrl,
  invalidateAvatarCache,
  subscribeAvatarCache,
} from "@/lib/avatar-cache";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState, useSyncExternalStore } from "react";

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
  const cacheRevision = useSyncExternalStore(
    (listener) => subscribeAvatarCache(imagePath, listener),
    () => getAvatarCacheSnapshot(imagePath),
    () => 0,
  );
  const [source, setSource] = useState<string | null>(null);
  const [sourceRevision, setSourceRevision] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void getAvatarObjectUrl(imagePath, async () => {
      const result = await createSupabaseBrowserClient()
        .storage
        .from(alphaProfileImageBucket)
        .download(imagePath);
      if (result.error || !result.data) {
        throw new Error("avatar_download_failed");
      }
      return result.data;
    })
      .then((objectUrl) => {
        if (!active) return;
        setSource(objectUrl);
        setSourceRevision(cacheRevision);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [cacheRevision, imagePath]);

  // A native image keeps private Storage blobs out of Next's image proxy.
  return (
    <span className={className} aria-hidden="true">
      {source && sourceRevision === cacheRevision && !failed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            invalidateAvatarCache(imagePath);
            setFailed(true);
          }}
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
