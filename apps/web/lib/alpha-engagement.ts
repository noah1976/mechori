import type { EngagementEventName } from "@mechori/core";
import { isAlphaActivityTrackingEnabled } from "@/lib/runtime-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function recordAlphaEngagement(name: EngagementEventName): Promise<void> {
  if (!isAlphaActivityTrackingEnabled()) return;
  const { error } = await createSupabaseBrowserClient().rpc("record_monthly_activity", {
    p_event_name: name,
  });
  if (error) throw new Error("alpha_activity_record_failed");
}
