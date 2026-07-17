import type { AppData } from "./types.ts";
import { getFollowingFeed, getOwnJournals } from "./social.ts";

export type EngagementEventName =
  | "session_started"
  | "garage_viewed"
  | "feed_viewed"
  | "history_reused"
  | "knowledge_searched"
  | "vehicle_created"
  | "maintenance_saved"
  | "journal_saved"
  | "result_followed_up";

export interface EngagementEvent {
  id: string;
  anonymousActorId: string;
  name: EngagementEventName;
  occurredAt: string;
  appVersion: string;
}

export interface MonthlyEngagementSummary {
  month: string;
  monthlyActiveActors: number;
  monthlyValueActiveActors: number;
  valueEventCount: number;
  eventCounts: Partial<Record<EngagementEventName, number>>;
}

export interface MonthlyOwnerSummary {
  month: string;
  recordCount: number;
  journalCount: number;
  unresolvedCount: number;
  followingUpdateCount: number;
}

const valueEvents = new Set<EngagementEventName>([
  "garage_viewed",
  "feed_viewed",
  "history_reused",
  "knowledge_searched",
  "vehicle_created",
  "maintenance_saved",
  "journal_saved",
  "result_followed_up",
]);

export function monthKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error("invalid_date");
  return date.toISOString().slice(0, 7);
}

export function isValueEngagementEvent(name: EngagementEventName): boolean {
  return valueEvents.has(name);
}

export function summarizeMonthlyEngagement(
  events: EngagementEvent[],
  month: string,
): MonthlyEngagementSummary {
  const monthlyEvents = events.filter((event) => monthKey(event.occurredAt) === month);
  const activeActors = new Set(monthlyEvents.map((event) => event.anonymousActorId));
  const monthlyValueEvents = monthlyEvents.filter((event) => isValueEngagementEvent(event.name));
  const valueActors = new Set(monthlyValueEvents.map((event) => event.anonymousActorId));
  const eventCounts: MonthlyEngagementSummary["eventCounts"] = {};

  monthlyEvents.forEach((event) => {
    eventCounts[event.name] = (eventCounts[event.name] ?? 0) + 1;
  });

  return {
    month,
    monthlyActiveActors: activeActors.size,
    monthlyValueActiveActors: valueActors.size,
    valueEventCount: monthlyValueEvents.length,
    eventCounts,
  };
}

export function buildMonthlyOwnerSummary(
  data: AppData,
  now = new Date(),
): MonthlyOwnerSummary {
  const month = monthKey(now);
  const ownVehicleIds = new Set(
    data.vehicles
      .filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId)
      .map((vehicle) => vehicle.id),
  );
  const records = data.records.filter(
    (record) => ownVehicleIds.has(record.vehicleId) && record.serviceDate.startsWith(month),
  );
  const journals = getOwnJournals(data).filter((journal) => journal.createdAt.startsWith(month));
  const followingUpdates = getFollowingFeed(data).filter((journal) =>
    (journal.publishedAt ?? journal.createdAt).startsWith(month),
  );

  return {
    month,
    recordCount: records.length,
    journalCount: journals.length,
    unresolvedCount: data.records.filter(
      (record) => ownVehicleIds.has(record.vehicleId) && record.resolutionStatus === "unresolved",
    ).length,
    followingUpdateCount: followingUpdates.length,
  };
}
