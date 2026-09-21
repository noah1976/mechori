import type { MaintenanceRecord, Vehicle, VehiclePassport } from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMechoriRuntime } from "@/lib/runtime-config";
import {
  buildPassportShareProjection,
  type PassportHistoryEntryProjection,
  type PassportShareProjection,
} from "@/lib/passport-share-projection";

export {
  buildPassportMaintenanceHistoryProjection,
  buildPassportShareProjection,
  type PassportHistoryEntryProjection,
  type PassportHistoryItemProjection,
  type PassportShareProjection,
} from "@/lib/passport-share-projection";

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
  records: readonly MaintenanceRecord[] = [],
  existingToken?: string,
  includeHistory = false,
): Promise<string> {
  const token = existingToken ?? createPassportShareToken();
  if (!TOKEN_PATTERN.test(token)) throw new Error("passport_share_token_invalid");
  const projection = buildPassportShareProjection(vehicle, passport, records, includeHistory);
  if (getMechoriRuntime() !== "alpha") {
    window.localStorage.setItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`, JSON.stringify(projection));
    window.localStorage.setItem(`${LOCAL_PASSPORT_SHARE_OWNER_PREFIX}${token}`, vehicle.id);
    return token;
  }
  const { data, error } = await createSupabaseBrowserClient().rpc(
    includeHistory ? "create_passport_share_v2" : "create_passport_share",
    {
    p_token: token,
    p_vehicle_id: vehicle.id,
    p_projection: projectionToDatabase(projection),
    },
  );
  if (error || data !== true) throw new Error("passport_share_create_failed");
  return token;
}

export async function loadPassportShare(token: string): Promise<PassportShareProjection | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  if (getMechoriRuntime() !== "alpha") {
    const stored = window.localStorage.getItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<PassportShareProjection>;
    return {
      ...parsed,
      projectionVersion: parsed.projectionVersion === 2 ? 2 : 1,
    } as PassportShareProjection;
  }
  const client = createSupabaseBrowserClient();
  const current = await client
    .rpc("get_public_passport_share_v2", { p_token: token })
    .maybeSingle();
  if (!current.error) {
    return current.data ? mapProjection(current.data as Record<string, unknown>) : null;
  }
  if (current.error.code !== "PGRST202") throw new Error("passport_share_load_failed");
  const legacy = await client.rpc("get_public_passport_share", { p_token: token }).maybeSingle();
  if (legacy.error) throw new Error("passport_share_load_failed");
  return legacy.data ? mapProjection(legacy.data as Record<string, unknown>) : null;
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
    projection_version: projection.projectionVersion,
    maintenance_history: projection.maintenanceHistory?.map(historyEntryToDatabase) ?? null,
  };
}

function mapProjection(row: Record<string, unknown>): PassportShareProjection {
  const projectionVersion = optionalNumber(row.projection_version) === 2 ? 2 : 1;
  const maintenanceHistory = projectionVersion === 2
    ? mapMaintenanceHistory(row.maintenance_history)
    : undefined;
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
    projectionVersion,
    ...(maintenanceHistory ? { maintenanceHistory } : {}),
  };
}

function historyEntryToDatabase(entry: PassportHistoryEntryProjection): Record<string, unknown> {
  return {
    ...(entry.serviceDate ? { service_date: entry.serviceDate } : {}),
    service_date_precision: entry.serviceDatePrecision,
    ...(entry.odometerValue === undefined ? {} : { odometer_value: entry.odometerValue }),
    ...(entry.odometerUnit ? { odometer_unit: entry.odometerUnit } : {}),
    summary: entry.summary,
    ...(entry.resolutionStatus ? { resolution_status: entry.resolutionStatus } : {}),
    items: entry.items.map((item) => ({
      subject: item.subject,
      ...(item.observedCondition ? { observed_condition: item.observedCondition } : {}),
      ...(item.workPerformed ? { work_performed: item.workPerformed } : {}),
      parts: item.parts,
      ...(item.result ? { result: item.result } : {}),
      ...(item.followUpNote ? { follow_up_note: item.followUpNote } : {}),
    })),
  };
}

function mapMaintenanceHistory(value: unknown): PassportHistoryEntryProjection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const summary = optionalString(row.summary);
    const items = Array.isArray(row.items)
      ? row.items.flatMap((item) => mapHistoryItem(item))
      : [];
    if (!summary || items.length === 0) return [];
    const precision = row.service_date_precision;
    const unit = row.odometer_unit;
    return [{
      serviceDate: optionalString(row.service_date),
      serviceDatePrecision: precision === "day" || precision === "month" || precision === "year" ? precision : "unknown",
      odometerValue: optionalNumber(row.odometer_value),
      odometerUnit: unit === "mi" || unit === "unknown" ? unit : unit === "km" ? "km" : undefined,
      summary,
      resolutionStatus: row.resolution_status === "resolved" ? "resolved" : row.resolution_status === "unresolved" ? "unresolved" : undefined,
      items,
    }];
  });
}

function mapHistoryItem(value: unknown): PassportHistoryEntryProjection["items"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  const subject = optionalString(row.subject);
  if (!subject) return [];
  return [{
    subject,
    observedCondition: optionalString(row.observed_condition),
    workPerformed: optionalString(row.work_performed),
    parts: Array.isArray(row.parts) ? row.parts.filter((part): part is string => typeof part === "string" && Boolean(part)) : [],
    result: optionalString(row.result),
    followUpNote: optionalString(row.follow_up_note),
  }];
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
