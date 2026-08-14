type AvatarDownload = () => Promise<Blob>;

type PendingAvatar = {
  generation: number;
  version: number;
  promise: Promise<string>;
};

const objectUrls = new Map<string, string>();
const pendingDownloads = new Map<string, PendingAvatar>();
const versions = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
let cacheGeneration = 0;

function cacheKey(imagePath: string): string {
  return `alpha-profile-image:${imagePath}`;
}

function currentVersion(key: string): number {
  return versions.get(key) ?? 0;
}

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

export function getAvatarObjectUrl(
  imagePath: string,
  download: AvatarDownload,
): Promise<string> {
  const key = cacheKey(imagePath);
  const cached = objectUrls.get(key);
  if (cached) return Promise.resolve(cached);

  const version = currentVersion(key);
  const existing = pendingDownloads.get(key);
  if (
    existing &&
    existing.generation === cacheGeneration &&
    existing.version === version
  ) {
    return existing.promise;
  }

  const generation = cacheGeneration;
  const promise = download()
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      if (
        cacheGeneration !== generation ||
        currentVersion(key) !== version
      ) {
        URL.revokeObjectURL(objectUrl);
        throw new Error("avatar_cache_stale");
      }
      objectUrls.set(key, objectUrl);
      notify(key);
      return objectUrl;
    })
    .finally(() => {
      if (pendingDownloads.get(key)?.promise === promise) {
        pendingDownloads.delete(key);
      }
    });

  pendingDownloads.set(key, { generation, version, promise });
  return promise;
}

export function invalidateAvatarCache(imagePath: string): void {
  const key = cacheKey(imagePath);
  versions.set(key, currentVersion(key) + 1);
  const objectUrl = objectUrls.get(key);
  if (objectUrl) {
    objectUrls.delete(key);
    URL.revokeObjectURL(objectUrl);
  }
  notify(key);
}

export function clearAvatarCache(): void {
  cacheGeneration += 1;
  for (const objectUrl of objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  const keys = new Set([
    ...objectUrls.keys(),
    ...pendingDownloads.keys(),
    ...listeners.keys(),
  ]);
  objectUrls.clear();
  versions.clear();
  for (const key of keys) notify(key);
}

export function subscribeAvatarCache(
  imagePath: string,
  listener: () => void,
): () => void {
  const key = cacheKey(imagePath);
  const current = listeners.get(key) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(key, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(key);
  };
}

export function getAvatarCacheSnapshot(imagePath: string): number {
  return currentVersion(cacheKey(imagePath));
}
