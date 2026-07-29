import {
  createAlphaSharedJournalPayload,
  parseAlphaSharedJournalRow,
  type AlphaSharedJournal,
  type AlphaSharedJournalRow,
  type GarageJournalPost,
} from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function loadAlphaSharedJournals(): Promise<AlphaSharedJournal[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("alpha_shared_journals")
    .select("share_id,journal_id,author_display_name,payload,published_at,updated_at")
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("alpha_shared_journals_load_failed");
  return (data as AlphaSharedJournalRow[])
    .map(parseAlphaSharedJournalRow)
    .filter((item): item is AlphaSharedJournal => Boolean(item));
}

export async function publishAlphaSharedJournal(
  journal: GarageJournalPost,
  authorDisplayName: string,
): Promise<void> {
  const payload = createAlphaSharedJournalPayload(journal);
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("publish_alpha_shared_journal", {
    p_journal_id: journal.id,
    p_author_display_name: authorDisplayName.trim() || "MECHORI User",
    p_payload: payload,
    p_published_at: payload.publishedAt,
  });
  if (error) throw new Error("alpha_shared_journal_publish_failed");
}

export async function withdrawAlphaSharedJournal(journalId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("withdraw_alpha_shared_journal", {
    p_journal_id: journalId,
  });
  if (error) throw new Error("alpha_shared_journal_withdraw_failed");
}
