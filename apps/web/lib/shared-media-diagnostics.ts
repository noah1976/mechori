export interface SharedMediaLoadDiagnostic {
  errorId: string;
  photoId: string;
  stage: "authenticated_download";
  requestKind: "storage_authenticated_object_get";
  httpStatus: number | null;
  supabaseErrorCode: string;
  safeSummary: string;
  bucket: string;
  objectPathHash: string;
  pathShape: {
    segmentCount: number;
    startsWithBucketName: boolean;
    looksLikeUrl: boolean;
    hasLeadingSlash: boolean;
    containsEncodedSlash: boolean;
    containsDoubleEncoding: boolean;
  };
  sessionPresent: boolean;
  attempts: number;
}

export interface SharedMediaServerProbe {
  probeCode: string;
  userVerified: boolean;
  policyAllowsRead: boolean | null;
  listedInVisibleShare: boolean | null;
  serverDownloadStatus: number | null;
  serverDownloadErrorCode: string;
  manualDownloadStatus: number | null;
  manualDownloadErrorCode: string;
}

export async function createSharedMediaLoadDiagnostic(input: {
  photoId: string;
  bucket: string;
  objectPath: string;
  error: unknown;
  sessionPresent: boolean;
  attempts: number;
}): Promise<SharedMediaLoadDiagnostic> {
  const storageError = safeStorageError(input.error);
  const objectPathHash = await hashSharedMediaObjectPath(input.objectPath);
  return {
    errorId: `P069-${objectPathHash.slice(0, 10)}-${storageError.httpStatus ?? "x"}`,
    photoId: safeIdentifier(input.photoId),
    stage: "authenticated_download",
    requestKind: "storage_authenticated_object_get",
    httpStatus: storageError.httpStatus,
    supabaseErrorCode: storageError.code,
    safeSummary: storageError.summary,
    bucket: input.bucket,
    objectPathHash,
    pathShape: describeObjectPath(input.objectPath, input.bucket),
    sessionPresent: input.sessionPresent,
    attempts: input.attempts,
  };
}

export function isSafeSharedMediaObjectPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 500 &&
    /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(value) &&
    !value.includes("..")
  );
}

export async function sharedMediaObjectPathMatchesDiagnostic(
  objectPath: string,
  diagnostic: SharedMediaLoadDiagnostic,
): Promise<boolean> {
  return (await hashSharedMediaObjectPath(objectPath)) === diagnostic.objectPathHash;
}

export function createSharedMediaServerProbe(input: {
  userVerified: boolean;
  policyAllowsRead: boolean | null;
  listedInVisibleShare: boolean | null;
  serverDownloadError: unknown;
  serverDownloadSucceeded: boolean;
  manualDownloadStatus: number | null;
  manualDownloadErrorCode: string;
}): SharedMediaServerProbe {
  const storageError = input.serverDownloadSucceeded
    ? { httpStatus: 200, code: "none" }
    : safeStorageError(input.serverDownloadError);
  const probeCode = [
    input.userVerified ? "U1" : "U0",
    `P${nullableBooleanCode(input.policyAllowsRead)}`,
    `L${nullableBooleanCode(input.listedInVisibleShare)}`,
    `D${storageError.httpStatus ?? "x"}`,
    storageError.code,
    `M${input.manualDownloadStatus ?? "x"}`,
    input.manualDownloadErrorCode,
  ].join("-");
  return {
    probeCode,
    userVerified: input.userVerified,
    policyAllowsRead: input.policyAllowsRead,
    listedInVisibleShare: input.listedInVisibleShare,
    serverDownloadStatus: storageError.httpStatus,
    serverDownloadErrorCode: storageError.code,
    manualDownloadStatus: input.manualDownloadStatus,
    manualDownloadErrorCode: input.manualDownloadErrorCode,
  };
}

export function isSharedMediaServerProbe(
  value: unknown,
): value is SharedMediaServerProbe {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedMediaServerProbe>;
  return (
    typeof item.probeCode === "string" &&
    /^U[01]-P[01x]-L[01x]-D(?:\d{3}|x)-[a-z0-9_.-]{1,64}-M(?:\d{3}|x)-[a-z0-9_.-]{1,64}$/.test(item.probeCode) &&
    typeof item.userVerified === "boolean" &&
    (item.policyAllowsRead === null || typeof item.policyAllowsRead === "boolean") &&
    (item.listedInVisibleShare === null || typeof item.listedInVisibleShare === "boolean") &&
    (item.serverDownloadStatus === null ||
      (typeof item.serverDownloadStatus === "number" &&
        item.serverDownloadStatus >= 100 &&
        item.serverDownloadStatus <= 599)) &&
    typeof item.serverDownloadErrorCode === "string" &&
    /^[a-z0-9_.-]{1,64}$/.test(item.serverDownloadErrorCode) &&
    (item.manualDownloadStatus === null ||
      (typeof item.manualDownloadStatus === "number" &&
        item.manualDownloadStatus >= 100 &&
        item.manualDownloadStatus <= 599)) &&
    typeof item.manualDownloadErrorCode === "string" &&
    /^[a-z0-9_.-]{1,64}$/.test(item.manualDownloadErrorCode)
  );
}

export function isSharedMediaLoadDiagnostic(
  value: unknown,
): value is SharedMediaLoadDiagnostic {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedMediaLoadDiagnostic>;
  return (
    typeof item.errorId === "string" && /^P069-[a-f0-9]{10}-(?:\d{3}|x)$/.test(item.errorId) &&
    typeof item.photoId === "string" && item.photoId.length <= 160 &&
    item.stage === "authenticated_download" &&
    item.requestKind === "storage_authenticated_object_get" &&
    (item.httpStatus === null ||
      (typeof item.httpStatus === "number" && item.httpStatus >= 100 && item.httpStatus <= 599)) &&
    typeof item.supabaseErrorCode === "string" && item.supabaseErrorCode.length <= 64 &&
    typeof item.safeSummary === "string" && item.safeSummary.length <= 120 &&
    item.bucket === "alpha-journal-media" &&
    typeof item.objectPathHash === "string" && /^[a-f0-9]{64}$/.test(item.objectPathHash) &&
    Boolean(item.pathShape) &&
    typeof item.pathShape?.segmentCount === "number" &&
    typeof item.pathShape?.startsWithBucketName === "boolean" &&
    typeof item.pathShape?.looksLikeUrl === "boolean" &&
    typeof item.pathShape?.hasLeadingSlash === "boolean" &&
    typeof item.pathShape?.containsEncodedSlash === "boolean" &&
    typeof item.pathShape?.containsDoubleEncoding === "boolean" &&
    typeof item.sessionPresent === "boolean" &&
    typeof item.attempts === "number" && item.attempts >= 1 && item.attempts <= 4
  );
}

function safeStorageError(error: unknown): {
  httpStatus: number | null;
  code: string;
  summary: string;
} {
  if (!error || typeof error !== "object") {
    return { httpStatus: null, code: "unknown_storage_error", summary: "Storage request failed" };
  }
  const item = error as Record<string, unknown>;
  const httpStatus = parseHttpStatus(item.statusCode ?? item.status);
  const code = safeErrorCode(item.error ?? item.code ?? item.name);
  return { httpStatus, code, summary: storageErrorSummary(httpStatus) };
}

function parseHttpStatus(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d{3}$/.test(value)
      ? Number(value)
      : NaN;
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : null;
}

function safeErrorCode(value: unknown): string {
  if (typeof value !== "string") return "storage_error";
  const normalized = value.trim().replace(/\s+/g, "_").toLowerCase();
  return /^[a-z0-9_.-]{1,64}$/.test(normalized) ? normalized : "storage_error";
}

function storageErrorSummary(status: number | null): string {
  if (status === 400) return "Storage rejected the object request";
  if (status === 401) return "Storage authentication was not accepted";
  if (status === 403) return "Storage access was denied";
  if (status === 404) return "Shared object was not found";
  if (status !== null && status >= 500) return "Storage service could not complete the request";
  return "Storage request failed";
}

function describeObjectPath(objectPath: string, bucket: string) {
  return {
    segmentCount: objectPath.split("/").filter(Boolean).length,
    startsWithBucketName: objectPath === bucket || objectPath.startsWith(`${bucket}/`),
    looksLikeUrl: /^https?:\/\//i.test(objectPath),
    hasLeadingSlash: objectPath.startsWith("/"),
    containsEncodedSlash: /%2f/i.test(objectPath),
    containsDoubleEncoding: /%25[0-9a-f]{2}/i.test(objectPath),
  };
}

export async function hashSharedMediaObjectPath(objectPath: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(objectPath),
    );
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return "0".repeat(64);
  }
}

function nullableBooleanCode(value: boolean | null): string {
  return value === null ? "x" : value ? "1" : "0";
}

function safeIdentifier(value: string): string {
  return /^[A-Za-z0-9_-]{1,160}$/.test(value) ? value : "invalid-photo-id";
}
