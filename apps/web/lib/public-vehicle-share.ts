import type { Vehicle } from "@mechori/core";
import {
  classifyPublicVehicleShareError,
  type PublicVehicleShareErrorKind,
} from "@/lib/public-vehicle-share-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface PublicVehicleShare {
  slug: string;
  make: string;
  model: string;
  nickname?: string;
  modelYear?: number;
  ownershipStartedYear?: number;
  ownershipStartedMonth?: number;
  ownerComment?: string;
  imageDataUrl: string;
  publishedAt: string;
}

export async function publishVehicleShare(vehicle: Vehicle): Promise<PublicVehicleShare> {
  if (!vehicle.imagePath || !/^data:image\/(?:webp|jpeg);base64,/.test(vehicle.imagePath)) {
    throw new Error("prepared_vehicle_photo_required");
  }
  const supabase = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("authentication_required");

  const { data, error } = await supabase
    .from("alpha_public_vehicle_shares")
    .upsert({
      user_id: authData.user.id,
      vehicle_id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      nickname: vehicle.nickname?.trim() || null,
      model_year: vehicle.year ?? null,
      ownership_started_year: vehicle.ownershipStartedYear ?? null,
      ownership_started_month: vehicle.ownershipStartedMonth ?? null,
      owner_comment: vehicle.ownerComment ?? null,
      image_data_url: vehicle.imagePath,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,vehicle_id" })
    .select("slug,make,model,nickname,model_year,ownership_started_year,ownership_started_month,owner_comment,image_data_url,published_at")
    .single();

  if (error || !data) throw publicVehicleShareServiceError(error, "publish");
  return mapShare(data);
}

export async function loadPublicVehicleShare(slug: string): Promise<PublicVehicleShare | null> {
  if (!/^[0-9a-f]{24}$/.test(slug)) return null;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("alpha_public_vehicle_shares")
    .select("slug,make,model,nickname,model_year,ownership_started_year,ownership_started_month,owner_comment,image_data_url,published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw publicVehicleShareServiceError(error, "load_public");
  return data ? mapShare(data) : null;
}

export async function loadOwnVehicleShare(vehicleId: string): Promise<PublicVehicleShare | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .rpc("get_my_vehicle_share", { p_vehicle_id: vehicleId })
    .maybeSingle();
  if (error) throw publicVehicleShareServiceError(error, "load_own");
  return data ? mapShare(data) : null;
}

export async function unpublishVehicleShare(slug: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("alpha_public_vehicle_shares")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) throw publicVehicleShareServiceError(error, "unpublish");
}

function publicVehicleShareServiceError(
  error: unknown,
  operation: "publish" | "load_public" | "load_own" | "unpublish",
): Error {
  const category = classifyPublicVehicleShareError(error);
  const effectiveCategory: PublicVehicleShareErrorKind =
    category === "unknown" && isLikelyTemporaryShareError(error) ? "temporary" : category;

  console.error("[public-vehicle-share] operation failed", {
    operation,
    category: effectiveCategory,
    serviceCode: errorDetail(error, "code"),
    serviceMessage: errorDetail(error, "message"),
  });

  return new Error(`public_vehicle_share_${effectiveCategory}`);
}

function isLikelyTemporaryShareError(error: unknown): boolean {
  return !error || (typeof error === "object" && !errorDetail(error, "code"));
}

function errorDetail(error: unknown, key: "code" | "message"): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function mapShare(row: Record<string, unknown>): PublicVehicleShare {
  return {
    slug: String(row.slug),
    make: String(row.make),
    model: String(row.model),
    nickname: typeof row.nickname === "string" ? row.nickname : undefined,
    modelYear: typeof row.model_year === "number" ? row.model_year : undefined,
    ownershipStartedYear: typeof row.ownership_started_year === "number" ? row.ownership_started_year : undefined,
    ownershipStartedMonth: typeof row.ownership_started_month === "number" ? row.ownership_started_month : undefined,
    ownerComment: typeof row.owner_comment === "string" ? row.owner_comment : undefined,
    imageDataUrl: String(row.image_data_url),
    publishedAt: String(row.published_at),
  };
}
