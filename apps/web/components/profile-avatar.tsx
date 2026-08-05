"use client";

/* Private profile images are fetched through the authenticated browser client. */
/* eslint-disable @next/next/no-img-element */

import { alphaProfileImageBucket } from "@/lib/alpha-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

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
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setSource(null);
    setFailed(false);

    void createSupabaseBrowserClient()
      .storage
      .from(alphaProfileImageBucket)
      .download(imagePath)
      .then((result: { data: Blob | null; error: unknown }) => {
        if (!active) return;
        if (result.error || !result.data) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(result.data);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  // A native image keeps private Storage blobs out of Next's image proxy.
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
