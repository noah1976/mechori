import { createAuthSession, signedOutSession, type AuthSession } from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function loadAlphaAuthSession(): Promise<AuthSession> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return signedOutSession;

  const { data: membership, error: membershipError } = await supabase
    .from("test_memberships")
    .select("status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (membershipError) return signedOutSession;
  if (membership?.status !== "active") {
    await supabase.auth.signOut();
    return signedOutSession;
  }

  return createAuthSession(
    "google",
    data.user.id,
    data.user.last_sign_in_at ?? new Date().toISOString(),
  );
}

export async function signOutFromAlpha(): Promise<void> {
  const { error } = await createSupabaseBrowserClient().auth.signOut();
  if (error) throw new Error("alpha_sign_out_failed");
}
