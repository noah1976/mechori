export type MechoriRuntime = "local" | "alpha";

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function getMechoriRuntime(): MechoriRuntime {
  return process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha" ? "alpha" : "local";
}

export function isAlphaActivityTrackingEnabled(): boolean {
  return (
    getMechoriRuntime() === "alpha" &&
    process.env.NEXT_PUBLIC_MECHORI_ACTIVITY_TRACKING === "enabled"
  );
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) throw new Error("incomplete_supabase_public_config");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("invalid_supabase_url");
  }
  if (parsedUrl.protocol !== "https:") throw new Error("invalid_supabase_url");

  return { url: parsedUrl.toString().replace(/\/$/, ""), publishableKey };
}

export function requireAlphaSupabaseConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (getMechoriRuntime() !== "alpha" || !config) {
    throw new Error("alpha_supabase_config_required");
  }
  return config;
}
