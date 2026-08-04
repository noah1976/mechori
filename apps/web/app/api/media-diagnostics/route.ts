import {
  createSharedMediaServerProbe,
  isSafeSharedMediaObjectPath,
  isSharedMediaLoadDiagnostic,
  sharedMediaObjectPathMatchesDiagnostic,
} from "@/lib/shared-media-diagnostics";
import { requireAlphaSupabaseConfig } from "@/lib/runtime-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sharedMediaBucket = "alpha-journal-media";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  const requestPayload = payload as Record<string, unknown>;
  const diagnostic = requestPayload.diagnostic;
  const objectPath = requestPayload.objectPath;
  if (
    !isSharedMediaLoadDiagnostic(diagnostic) ||
    !isSafeSharedMediaObjectPath(objectPath) ||
    !(await sharedMediaObjectPathMatchesDiagnostic(objectPath, diagnostic))
  ) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const [{ data: policyData, error: policyError }, { data: sharedData, error: sharedError }] =
    await Promise.all([
      supabase.rpc("can_read_alpha_shared_journal_media", { p_path: objectPath }),
      supabase.rpc("list_alpha_shared_journals"),
    ]);
  const listedInVisibleShare = sharedError
    ? null
    : sharedJournalRowsContainPath(sharedData, objectPath);
  const policyAllowsRead = policyError || typeof policyData !== "boolean"
    ? null
    : policyData;
  const download = await supabase.storage.from(sharedMediaBucket).download(objectPath);
  const { data: sessionData } = await supabase.auth.getSession();
  const objectDownload = await probeStorageDownload(
    objectPath,
    sessionData.session?.access_token ?? null,
    "object",
  );
  const authenticatedDownload = await probeStorageDownload(
    objectPath,
    sessionData.session?.access_token ?? null,
    "object/authenticated",
  );
  const signedUrl = await supabase.storage
    .from(sharedMediaBucket)
    .createSignedUrl(objectPath, 60);
  const signedUrlFetch = signedUrl.error || !signedUrl.data?.signedUrl
    ? { status: null, errorCode: "signed_url_unavailable" }
    : await probeSignedStorageDownload(signedUrl.data.signedUrl);
  const probe = createSharedMediaServerProbe({
    userVerified: true,
    policyAllowsRead,
    listedInVisibleShare,
    serverDownloadError: download.error,
    serverDownloadSucceeded: !download.error && Boolean(download.data),
    objectDownloadStatus: objectDownload.status,
    objectDownloadErrorCode: objectDownload.errorCode,
    authenticatedDownloadStatus: authenticatedDownload.status,
    authenticatedDownloadErrorCode: authenticatedDownload.errorCode,
    signedUrlCreateError: signedUrl.error,
    signedUrlCreated: !signedUrl.error && Boolean(signedUrl.data?.signedUrl),
    signedUrlFetchStatus: signedUrlFetch.status,
    signedUrlFetchErrorCode: signedUrlFetch.errorCode,
  });

  console.warn("[P-069 shared-media-load]", {
    diagnostic,
    probe,
    policyProbeErrorCode: safeErrorCode(policyError),
    sharedListErrorCode: safeErrorCode(sharedError),
  });
  return Response.json({ probe });
}

async function probeStorageDownload(
  objectPath: string,
  accessToken: string | null,
  route: "object" | "object/authenticated",
): Promise<{ status: number | null; errorCode: string }> {
  if (!accessToken) return { status: null, errorCode: "session_token_unavailable" };
  const config = requireAlphaSupabaseConfig();
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(
      `${config.url}/storage/v1/${route}/${sharedMediaBucket}/${encodedPath}`,
      {
        headers: {
          apikey: config.publishableKey,
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );
    const errorCode = response.ok ? "none" : await safeStorageResponseCode(response);
    if (response.body) await response.body.cancel().catch(() => undefined);
    return { status: response.status, errorCode };
  } catch {
    return { status: null, errorCode: "manual_request_failed" };
  }
}

async function probeSignedStorageDownload(
  signedUrl: string,
): Promise<{ status: number | null; errorCode: string }> {
  try {
    const response = await fetch(signedUrl, { cache: "no-store" });
    const errorCode = response.ok ? "none" : await safeStorageResponseCode(response);
    if (response.body) await response.body.cancel().catch(() => undefined);
    return { status: response.status, errorCode };
  } catch {
    return { status: null, errorCode: "signed_request_failed" };
  }
}

async function safeStorageResponseCode(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.clone().json();
    if (!payload || typeof payload !== "object") return "storage_error";
    const item = payload as Record<string, unknown>;
    return safeErrorCode({ code: item.error ?? item.code ?? item.name });
  } catch {
    return "storage_error";
  }
}

function sharedJournalRowsContainPath(value: unknown, objectPath: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((row) => {
    if (!row || typeof row !== "object") return false;
    const payload = (row as Record<string, unknown>).payload;
    if (!payload || typeof payload !== "object") return false;
    const media = (payload as Record<string, unknown>).media;
    return Array.isArray(media) && media.some((item) =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as Record<string, unknown>).assetPath === objectPath
    );
  });
}

function safeErrorCode(value: unknown): string {
  if (!value || typeof value !== "object") return "none";
  const item = value as Record<string, unknown>;
  const candidate = item.code ?? item.name;
  if (typeof candidate !== "string") return "error";
  const normalized = candidate.trim().toLowerCase().replace(/\s+/g, "_");
  return /^[a-z0-9_.-]{1,64}$/.test(normalized) ? normalized : "error";
}
