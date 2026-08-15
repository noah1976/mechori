import {
  alphaSharedJournalMaxMediaBytes,
  createAlphaSharedJournalPayload,
  parseAlphaSharedJournalRow,
  reusableAlphaSharedJournalMedia,
  type AlphaSharedJournal,
  type AlphaSharedJournalRow,
  type GarageJournalPost,
  type JournalMediaAttachment,
} from "@mechori/core";
import { preparePrivateAlphaImage } from "@/lib/image-preparation";
import { journalMediaStore } from "@/lib/media-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const alphaSharedJournalMediaBucket = "alpha-journal-media";
const maxPreparedSharedImageBytes = 460 * 1024;
const maxSharedImageDimension = 1400;

export async function loadAlphaSharedJournals(): Promise<AlphaSharedJournal[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_alpha_shared_journals");
  if (error) throw new Error("alpha_shared_journals_load_failed");
  return (data as AlphaSharedJournalRow[])
    .map(parseAlphaSharedJournalRow)
    .filter((item): item is AlphaSharedJournal => Boolean(item));
}

export async function publishAlphaSharedJournal(
  journal: GarageJournalPost,
  authorDisplayName: string,
  previousSharedJournal?: GarageJournalPost,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("authentication_required");

  const { sharedMedia, uploadedPaths } = await uploadSharedJournalImages(
    journal,
    userData.user.id,
    previousSharedJournal,
  );
  let payload: ReturnType<typeof createAlphaSharedJournalPayload>;
  try {
    payload = createAlphaSharedJournalPayload(journal, { sharedMedia });
  } catch (error) {
    await removeSharedMediaQuietly(uploadedPaths);
    throw error;
  }
  const { error } = await supabase.rpc("publish_alpha_shared_journal", {
    p_journal_id: journal.id,
    p_author_display_name: authorDisplayName.trim() || "MECHORI User",
    p_payload: payload,
    p_published_at: payload.publishedAt,
  });
  if (error) {
    await removeSharedMediaQuietly(uploadedPaths);
    throw new Error("alpha_shared_journal_publish_failed");
  }
  await removeStaleSharedJournalImagesQuietly(
    userData.user.id,
    journal.id,
    new Set(sharedMedia.map((attachment) => attachment.assetPath)),
  );
}

export async function withdrawAlphaSharedJournal(journalId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("authentication_required");
  const { error } = await supabase.rpc("withdraw_alpha_shared_journal", {
    p_journal_id: journalId,
  });
  if (error) throw new Error("alpha_shared_journal_withdraw_failed");
  await removeStaleSharedJournalImagesQuietly(
    userData.user.id,
    journalId,
    new Set(),
  );
}

async function uploadSharedJournalImages(
  journal: GarageJournalPost,
  userId: string,
  previousSharedJournal?: GarageJournalPost,
): Promise<{
  sharedMedia: JournalMediaAttachment[];
  uploadedPaths: string[];
}> {
  const candidates = journal.media.filter(
    (attachment) =>
      attachment.kind === "image" &&
      attachment.privacyState === "public_ready",
  );
  const uploadedPaths: string[] = [];
  const revision = safePathSegment(journal.updatedAt);
  const reusableById = new Map(
    reusableAlphaSharedJournalMedia(journal, previousSharedJournal).map(
      (attachment) => [attachment.id, attachment],
    ),
  );

  try {
    const sharedMedia: JournalMediaAttachment[] = [];
    for (const attachment of candidates) {
      const reusable = reusableById.get(attachment.id);
      if (reusable) {
        sharedMedia.push(reusable);
        continue;
      }
      const privateBlob = await loadPrivateAttachmentBlob(attachment);
      if (!privateBlob) throw new Error("shared_image_not_found");
      const prepared = await prepareSharedJournalImage(privateBlob, attachment);
      const blob = prepared.blob;
      const mimeType = normalizedSharedMimeType(prepared.mimeType);
      if (!mimeType || blob.size < 1 || blob.size > alphaSharedJournalMaxMediaBytes) {
        throw new Error("invalid_shared_image");
      }
      const path = [
        safePathSegment(userId),
        safePathSegment(journal.id),
        `${revision}-${safePathSegment(attachment.id)}.${fileExtension(mimeType)}`,
      ].join("/");
      const { error } = await createSupabaseBrowserClient()
        .storage
        .from(alphaSharedJournalMediaBucket)
        .upload(path, blob, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: true,
        });
      if (error) throw new Error("alpha_shared_image_upload_failed");
      uploadedPaths.push(path);
      sharedMedia.push({
        id: attachment.id,
        kind: "image",
        source: "alpha_shared",
        assetPath: path,
        mimeType,
        sizeBytes: blob.size,
        altText: attachment.altText,
        privacyState: "public_ready",
        createdAt: attachment.createdAt,
        isDemo: false,
      });
    }
    return { sharedMedia, uploadedPaths };
  } catch (error) {
    await removeSharedMediaQuietly(uploadedPaths);
    throw error;
  }
}

async function prepareSharedJournalImage(
  blob: Blob,
  attachment: JournalMediaAttachment,
): Promise<{ blob: Blob; mimeType: string }> {
  const sourceMimeType = blob.type || attachment.mimeType || "application/octet-stream";
  const prepared = await preparePrivateAlphaImage(
    new File(
      [blob],
      `shared-${safePathSegment(attachment.id)}.${sourceFileExtension(sourceMimeType)}`,
      { type: sourceMimeType },
    ),
    {
      maxDimension: maxSharedImageDimension,
      maxOutputBytes: maxPreparedSharedImageBytes,
    },
  );
  return { blob: prepared.blob, mimeType: prepared.mimeType };
}

async function loadPrivateAttachmentBlob(
  attachment: JournalMediaAttachment,
): Promise<Blob | null> {
  if (attachment.source === "local_blob" && attachment.storageKey) {
    return journalMediaStore.load(attachment.storageKey);
  }
  if (attachment.source === "alpha_inline" && attachment.assetPath) {
    const response = await fetch(attachment.assetPath);
    return response.ok ? response.blob() : null;
  }
  return null;
}

async function removeStaleSharedJournalImages(
  userId: string,
  journalId: string,
  retainedPaths: Set<string | undefined>,
): Promise<void> {
  const folder = `${safePathSegment(userId)}/${safePathSegment(journalId)}`;
  const storage = createSupabaseBrowserClient().storage.from(alphaSharedJournalMediaBucket);
  const { data, error } = await storage.list(folder, { limit: 100 });
  if (error) throw new Error("alpha_shared_image_list_failed");
  const stalePaths = (data ?? [])
    .map((item: { name: string }) => `${folder}/${item.name}`)
    .filter((path: string) => !retainedPaths.has(path));
  await removeSharedMedia(stalePaths);
}

async function removeStaleSharedJournalImagesQuietly(
  userId: string,
  journalId: string,
  retainedPaths: Set<string | undefined>,
): Promise<void> {
  try {
    await removeStaleSharedJournalImages(userId, journalId, retainedPaths);
  } catch {
    // Shared rows are the access gate. Orphan cleanup can safely retry later.
  }
}

async function removeSharedMedia(
  paths: Array<string | undefined>,
): Promise<void> {
  const validPaths = paths.filter((path): path is string => Boolean(path));
  if (validPaths.length === 0) return;
  const { error } = await createSupabaseBrowserClient()
    .storage
    .from(alphaSharedJournalMediaBucket)
    .remove(validPaths);
  if (error) throw new Error("alpha_shared_image_remove_failed");
}

async function removeSharedMediaQuietly(
  paths: Array<string | undefined>,
): Promise<void> {
  try {
    await removeSharedMedia(paths);
  } catch {
    // Unreferenced objects are not readable by other testers under Storage RLS.
  }
}

function normalizedSharedMimeType(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return ["image/jpeg", "image/png", "image/webp"].includes(normalized)
    ? normalized
    : null;
}

function fileExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function sourceFileExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "heic";
}

function safePathSegment(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-");
  if (!normalized) throw new Error("invalid_shared_image_path");
  return normalized.slice(0, 160);
}
