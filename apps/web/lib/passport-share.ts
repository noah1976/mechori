import type { Vehicle, VehiclePassport } from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMechoriRuntime } from "@/lib/runtime-config";
import {
  buildPassportShareProjection,
  type PassportShareProjection,
} from "@/lib/passport-share-projection";

export { buildPassportShareProjection, type PassportShareProjection } from "@/lib/passport-share-projection";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const LOCAL_PASSPORT_SHARE_PREFIX = "mechori.local.passport-share.";
export const LOCAL_PASSPORT_SHARE_OWNER_PREFIX = "mechori.local.passport-share-owner.";

export function createPassportShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function publishPassportShare(
  vehicle: Vehicle,
  passport: VehiclePassport,
  existingToken?: string,
): Promise<string> {
  const token = existingToken ?? createPassportShareToken();
  if (!TOKEN_PATTERN.test(token)) throw new Error("passport_share_token_invalid");
  const projection = buildPassportShareProjection(vehicle, passport);
  if (getMechoriRuntime() !== "alpha") {
    window.localStorage.setItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`, JSON.stringify(projection));
    window.localStorage.setItem(`${LOCAL_PASSPORT_SHARE_OWNER_PREFIX}${token}`, vehicle.id);
    return token;
  }
  const { data, error } = await createSupabaseBrowserClient().rpc("create_passport_share", {
    p_token: token,
    p_vehicle_id: vehicle.id,
    p_projection: projectionToDatabase(projection),
  });
  if (error || data !== true) throw new Error("passport_share_create_failed");
  return token;
}

export async function loadPassportShare(token: string): Promise<PassportShareProjection | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  if (getMechoriRuntime() !== "alpha") {
    const stored = window.localStorage.getItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`);
    return stored ? JSON.parse(stored) as PassportShareProjection : null;
  }
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("get_public_passport_share", { p_token: token })
    .maybeSingle();
  if (error) throw new Error("passport_share_load_failed");
  return data ? mapProjection(data as Record<string, unknown>) : null;
}

export async function revokePassportShare(token: string): Promise<void> {
  if (!TOKEN_PATTERN.test(token)) throw new Error("passport_share_token_invalid");
  if (getMechoriRuntime() !== "alpha") {
    window.localStorage.removeItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`);
    return;
  }
  const { data, error } = await createSupabaseBrowserClient().rpc("revoke_passport_share", {
    p_token: token,
  });
  if (error || data !== true) throw new Error("passport_share_revoke_failed");
}

function projectionToDatabase(projection: PassportShareProjection): Record<string, unknown> {
  return {
    make: projection.make,
    model: projection.model,
    nickname: projection.nickname ?? null,
    model_year: projection.modelYear ?? null,
    grade: projection.grade ?? null,
    model_code: projection.modelCode ?? null,
    specification_note: projection.specificationNote ?? null,
    odometer_value: projection.odometerValue ?? null,
    odometer_unit: projection.odometerUnit,
    modifications: projection.modifications ?? null,
    recent_maintenance: projection.recentMaintenance ?? null,
    workshop_concerns: projection.workshopConcerns ?? null,
    other_notes: projection.otherNotes ?? null,
    updated_at: projection.updatedAt,
  };
}

function mapProjection(row: Record<string, unknown>): PassportShareProjection {
  return {
    make: String(row.make),
    model: String(row.model),
    nickname: optionalString(row.nickname),
    modelYear: optionalNumber(row.model_year),
    grade: optionalString(row.grade),
    modelCode: optionalString(row.model_code),
    specificationNote: optionalString(row.specification_note),
    odometerValue: optionalNumber(row.odometer_value),
    odometerUnit: row.odometer_unit === "mi" || row.odometer_unit === "unknown" ? row.odometer_unit : "km",
    modifications: optionalString(row.modifications),
    recentMaintenance: optionalString(row.recent_maintenance),
    workshopConcerns: optionalString(row.workshop_concerns),
    otherNotes: optionalString(row.other_notes),
    updatedAt: String(row.updated_at),
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
