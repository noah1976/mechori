import { createEmptyAppData, migrateAppData, type AppData } from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function loadAlphaWorkspace(profileId: string): Promise<AppData> {
  const supabase = createSupabaseBrowserClient();
  const { data: row, error } = await supabase
    .from("alpha_private_workspaces")
    .select("payload")
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) throw new Error("alpha_workspace_load_failed");

  if (row) {
    const migrated = migrateAppData(row.payload);
    if (!migrated || migrated.currentProfileId !== profileId) {
      throw new Error("alpha_workspace_invalid");
    }
    return migrated;
  }

  const initialData = createEmptyAppData(profileId);
  await saveAlphaWorkspace(initialData);
  return initialData;
}

export async function saveAlphaWorkspace(data: AppData): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (authError || !user || user.id !== data.currentProfileId) {
    throw new Error("alpha_workspace_user_mismatch");
  }

  const { error } = await supabase.from("alpha_private_workspaces").upsert(
    {
      user_id: user.id,
      schema_version: data.schemaVersion,
      payload: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("alpha_workspace_save_failed");
}
