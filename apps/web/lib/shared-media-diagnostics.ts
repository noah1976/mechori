export type SharedMediaLoadStage =
  | "authenticated_download"
  | "download_transport"
  | "blob_validation"
  | "blob_url"
  | "image_decode";

export interface SharedMediaBlobMetadata {
  byteLength: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "missing" | "other";
}

export interface SharedMediaLoadDiagnostic {
  errorId: string;
  photoId: string;
  stage: SharedMediaLoadStage;
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
  blob?: SharedMediaBlobMetadata;
}

export interface SharedMediaServerProbe {
  probeCode: string;
  userVerified: boolean;
  objectOwnedByUser: boolean;
  policyAllowsRead: boolean | null;
  listedInVisibleShare: boolean | null;
  serverDownloadStatus: number | null;
  serverDownloadErrorCode: string;
  serverDownloadServiceCode: string;
  objectDownloadStatus: number | null;
  objectDownloadErrorCode: string;
  authenticatedDownloadStatus: number | null;
  authenticatedDownloadErrorCode: string;
  authOnlyDownloadStatus: number | null;
  authOnlyDownloadErrorCode: string;
  signedUrlCreateStatus: number | null;
  signedUrlCreateErrorCode: string;
  signedUrlFetchStatus: number | null;
  signedUrlFetchErrorCode: string;
}

export async function createSharedMediaLoadDiagnostic(input: {
  photoId: string;
  bucket: string;
  objectPath: string;
  error: unknown;
  sessionPresent: boolean;
  attempts: number;
  stage?: SharedMediaLoadStage;
  blob?: Pick<Blob, "size" | "type"> | SharedMediaBlobMetadata | null;
}): Promise<SharedMediaLoadDiagnostic> {
  const stage = input.stage ?? "authenticated_download";
  const storageError = safeStorageError(input.error);
  const objectPathHash = await hashSharedMediaObjectPath(input.objectPath);
  return {
    errorId: sharedMediaDiagnosticId(objectPathHash, storageError.httpStatus, stage),
    photoId: safeIdentifier(input.photoId),
    stage,
    requestKind: "storage_authenticated_object_get",
    httpStatus: storageError.httpStatus,
    supabaseErrorCode: storageError.code,
    safeSummary: sharedMediaFailureSummary(stage, storageError.httpStatus),
    bucket: input.bucket,
    objectPathHash,
    pathShape: describeObjectPath(input.objectPath, input.bucket),
    sessionPresent: input.sessionPresent,
    attempts: input.attempts,
    ...(input.blob ? {
      blob: isSharedMediaBlobMetadata(input.blob)
        ? input.blob
        : describeSharedMediaBlob(input.blob),
    } : {}),
  };
}

export function describeSharedMediaBlob(
  blob: Pick<Blob, "size" | "type">,
): SharedMediaBlobMetadata {
  return {
    byteLength: Number.isSafeInteger(blob.size) && blob.size >= 0 ? blob.size : 0,
    mimeType: safeBlobMimeType(blob.type),
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
  objectOwnedByUser: boolean;
  policyAllowsRead: boolean | null;
  listedInVisibleShare: boolean | null;
  serverDownloadError: unknown;
  serverDownloadSucceeded: boolean;
  objectDownloadStatus: number | null;
  objectDownloadErrorCode: string;
  authenticatedDownloadStatus: number | null;
  authenticatedDownloadErrorCode: string;
  authOnlyDownloadStatus: number | null;
  authOnlyDownloadErrorCode: string;
  signedUrlCreateError: unknown;
  signedUrlCreated: boolean;
  signedUrlFetchStatus: number | null;
  signedUrlFetchErrorCode: string;
}): SharedMediaServerProbe {
  const storageError = input.serverDownloadSucceeded
    ? { httpStatus: 200, code: "none", serviceCode: "none" }
    : safeStorageError(input.serverDownloadError);
  const signedUrlError = input.signedUrlCreated
    ? { httpStatus: 200, code: "none", serviceCode: "none" }
    : safeStorageError(input.signedUrlCreateError);
  const probeCode = [
    input.userVerified ? "U1" : "U0",
    input.objectOwnedByUser ? "W1" : "W0",
    `P${nullableBooleanCode(input.policyAllowsRead)}`,
    `L${nullableBooleanCode(input.listedInVisibleShare)}`,
    `D${storageError.httpStatus ?? "x"}`,
    storageError.code,
    storageError.serviceCode,
    `O${input.objectDownloadStatus ?? "x"}`,
    input.objectDownloadErrorCode,
    `A${input.authenticatedDownloadStatus ?? "x"}`,
    input.authenticatedDownloadErrorCode,
    `B${input.authOnlyDownloadStatus ?? "x"}`,
    input.authOnlyDownloadErrorCode,
    `S${signedUrlError.httpStatus ?? "x"}`,
    signedUrlError.code,
    `F${input.signedUrlFetchStatus ?? "x"}`,
    input.signedUrlFetchErrorCode,
  ].join("-");
  return {
    probeCode,
    userVerified: input.userVerified,
    objectOwnedByUser: input.objectOwnedByUser,
    policyAllowsRead: input.policyAllowsRead,
    listedInVisibleShare: input.listedInVisibleShare,
    serverDownloadStatus: storageError.httpStatus,
    serverDownloadErrorCode: storageError.code,
    serverDownloadServiceCode: storageError.serviceCode,
    objectDownloadStatus: input.objectDownloadStatus,
    objectDownloadErrorCode: input.objectDownloadErrorCode,
    authenticatedDownloadStatus: input.authenticatedDownloadStatus,
    authenticatedDownloadErrorCode: input.authenticatedDownloadErrorCode,
    authOnlyDownloadStatus: input.authOnlyDownloadStatus,
    authOnlyDownloadErrorCode: input.authOnlyDownloadErrorCode,
    signedUrlCreateStatus: signedUrlError.httpStatus,
    signedUrlCreateErrorCode: signedUrlError.code,
    signedUrlFetchStatus: input.signedUrlFetchStatus,
    signedUrlFetchErrorCode: input.signedUrlFetchErrorCode,
  };
}

export function isSharedMediaServerProbe(
  value: unknown,
): value is SharedMediaServerProbe {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedMediaServerProbe>;
  return (
    typeof item.probeCode === "string" &&
    /^U[01]-W[01]-P[01x]-L[01x]-D(?:\d{3}|x)(?:-[a-z0-9_.-]{1,64}){2}-O(?:\d{3}|x)-[a-z0-9_.-]{1,64}-A(?:\d{3}|x)-[a-z0-9_.-]{1,64}-B(?:\d{3}|x)-[a-z0-9_.-]{1,64}-S(?:\d{3}|x)-[a-z0-9_.-]{1,64}-F(?:\d{3}|x)-[a-z0-9_.-]{1,64}$/.test(item.probeCode) &&
    typeof item.userVerified === "boolean" &&
    typeof item.objectOwnedByUser === "boolean" &&
    (item.policyAllowsRead === null || typeof item.policyAllowsRead === "boolean") &&
    (item.listedInVisibleShare === null || typeof item.listedInVisibleShare === "boolean") &&
    (item.serverDownloadStatus === null ||
      (typeof item.serverDownloadStatus === "number" &&
        item.serverDownloadStatus >= 100 &&
        item.serverDownloadStatus <= 599)) &&
    typeof item.serverDownloadErrorCode === "string" &&
    /^[a-z0-9_.-]{1,64}$/.test(item.serverDownloadErrorCode) &&
    typeof item.serverDownloadServiceCode === "string" &&
    /^[a-z0-9_.-]{1,64}$/.test(item.serverDownloadServiceCode) &&
    isNullableHttpStatus(item.objectDownloadStatus) &&
    isSafeErrorCode(item.objectDownloadErrorCode) &&
    isNullableHttpStatus(item.authenticatedDownloadStatus) &&
    isSafeErrorCode(item.authenticatedDownloadErrorCode) &&
    isNullableHttpStatus(item.authOnlyDownloadStatus) &&
    isSafeErrorCode(item.authOnlyDownloadErrorCode) &&
    isNullableHttpStatus(item.signedUrlCreateStatus) &&
    isSafeErrorCode(item.signedUrlCreateErrorCode) &&
    isNullableHttpStatus(item.signedUrlFetchStatus) &&
    isSafeErrorCode(item.signedUrlFetchErrorCode)
  );
}

export function isSharedMediaLoadDiagnostic(
  value: unknown,
): value is SharedMediaLoadDiagnostic {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedMediaLoadDiagnostic>;
  return (
    typeof item.errorId === "string" && /^P069-[a-f0-9]{10}-(?:\d{3}|x)(?:-(?:download_transport|blob_validation|blob_url|image_decode))?$/.test(item.errorId) &&
    typeof item.photoId === "string" && item.photoId.length <= 160 &&
    isSharedMediaLoadStage(item.stage) &&
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
    typeof item.attempts === "number" && item.attempts >= 1 && item.attempts <= 4 &&
    (item.blob === undefined || isSharedMediaBlobMetadata(item.blob))
  );
}

function safeStorageError(error: unknown): {
  httpStatus: number | null;
  code: string;
  serviceCode: string;
  summary: string;
} {
  if (!error || typeof error !== "object") {
    return {
      httpStatus: null,
      code: "unknown_storage_error",
      serviceCode: "unknown_storage_error",
      summary: "Storage request failed",
    };
  }
  const item = error as Record<string, unknown>;
  const httpStatus = parseHttpStatus(item.status);
  const code = safeErrorCode(item.error ?? item.code ?? item.name);
  const serviceCode = safeErrorCode(item.statusCode ?? item.code ?? item.error);
  return { httpStatus, code, serviceCode, summary: storageErrorSummary(httpStatus) };
}

function isNullableHttpStatus(value: unknown): boolean {
  return value === null || (
    typeof value === "number" && value >= 100 && value <= 599
  );
}

function isSafeErrorCode(value: unknown): boolean {
  return typeof value === "string" && /^[a-z0-9_.-]{1,64}$/.test(value);
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

function sharedMediaFailureSummary(
  stage: SharedMediaLoadStage,
  status: number | null,
): string {
  if (stage === "download_transport") return "Storage request did not complete";
  if (stage === "blob_validation") return "Downloaded media data was unusable";
  if (stage === "blob_url") return "Browser could not prepare the media URL";
  if (stage === "image_decode") return "Browser could not render the media";
  return storageErrorSummary(status);
}

function sharedMediaDiagnosticId(
  objectPathHash: string,
  status: number | null,
  stage: SharedMediaLoadStage,
): string {
  const suffix = stage === "authenticated_download" ? "" : `-${stage}`;
  return `P069-${objectPathHash.slice(0, 10)}-${status ?? "x"}${suffix}`;
}

function isSharedMediaLoadStage(value: unknown): value is SharedMediaLoadStage {
  return value === "authenticated_download" ||
    value === "download_transport" ||
    value === "blob_validation" ||
    value === "blob_url" ||
    value === "image_decode";
}

function isSharedMediaBlobMetadata(value: unknown): value is SharedMediaBlobMetadata {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedMediaBlobMetadata>;
  const byteLength = item.byteLength;
  return typeof byteLength === "number" && Number.isSafeInteger(byteLength) && byteLength >= 0 &&
    (item.mimeType === "image/jpeg" || item.mimeType === "image/png" ||
      item.mimeType === "image/webp" || item.mimeType === "missing" || item.mimeType === "other");
}

function safeBlobMimeType(value: string): SharedMediaBlobMetadata["mimeType"] {
  const type = value.trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/png" || type === "image/webp") return type;
  return type ? "other" : "missing";
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
