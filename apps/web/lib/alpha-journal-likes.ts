import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AlphaJournalReaction {
  shareId: string;
  journalId: string;
  appreciationCount: number;
  likedByMe: boolean;
}

interface AlphaJournalReactionRow {
  share_id?: string;
  journal_id?: string;
  appreciation_count?: number | string;
  liked_by_me?: boolean | null;
}

export async function loadAlphaJournalReactions(): Promise<AlphaJournalReaction[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_alpha_journal_reactions",
  );
  if (error) throw new Error("alpha_journal_reactions_load_failed");
  return ((data ?? []) as AlphaJournalReactionRow[])
    .filter((row): row is Required<Pick<AlphaJournalReactionRow, "share_id" | "journal_id">> & AlphaJournalReactionRow =>
      typeof row.share_id === "string" && typeof row.journal_id === "string")
    .map((row) => ({
      shareId: row.share_id,
      journalId: row.journal_id,
      appreciationCount: Number(row.appreciation_count) || 0,
      likedByMe: row.liked_by_me === true,
    }));
}

export async function setAlphaJournalLike(
  shareId: string,
  liked: boolean,
): Promise<Pick<AlphaJournalReaction, "appreciationCount" | "likedByMe">> {
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("set_alpha_journal_like", {
      p_share_id: shareId,
      p_liked: liked,
    })
    .single();
  if (error || !data) throw new Error("alpha_journal_like_update_failed");
  const row = data as AlphaJournalReactionRow;
  return {
    appreciationCount: Number(row.appreciation_count) || 0,
    likedByMe: row.liked_by_me === true,
  };
}
