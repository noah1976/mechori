import {
  type EngagementEvent,
  type EngagementEventName,
} from "@mechori/core";

const eventsKey = "mechori.prototype.engagement.v1";
const actorKey = "mechori.prototype.engagement.actor";
const appVersion = "local-prototype-2026-07";
const maximumEvents = 500;
const retentionDays = 400;
const dailyDeduplicatedEvents = new Set<EngagementEventName>([
  "session_started",
  "garage_viewed",
  "feed_viewed",
  "history_reused",
]);
const allowedEvents = new Set<EngagementEventName>([
  "session_started",
  "garage_viewed",
  "feed_viewed",
  "history_reused",
  "knowledge_searched",
  "vehicle_created",
  "maintenance_saved",
  "journal_saved",
  "result_followed_up",
]);

export function recordLocalEngagement(
  name: EngagementEventName,
  now = new Date(),
): EngagementEvent | null {
  try {
    const occurredAt = now.toISOString();
    const actorId = readOrCreateActorId();
    const events = readLocalEngagementEvents();
    const day = occurredAt.slice(0, 10);
    if (
      dailyDeduplicatedEvents.has(name) &&
      events.some(
        (event) =>
          event.anonymousActorId === actorId &&
          event.name === name &&
          event.occurredAt.startsWith(day),
      )
    ) {
      return null;
    }

    const event: EngagementEvent = {
      id: `engagement-${crypto.randomUUID()}`,
      anonymousActorId: actorId,
      name,
      occurredAt,
      appVersion,
    };
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const nextEvents = [...events.filter((item) => item.occurredAt >= cutoff), event]
      .slice(-maximumEvents);
    window.localStorage.setItem(eventsKey, JSON.stringify(nextEvents));
    return event;
  } catch {
    return null;
  }
}

export function readLocalEngagementEvents(): EngagementEvent[] {
  try {
    const raw = window.localStorage.getItem(eventsKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEngagementEvent);
  } catch {
    return [];
  }
}

export function resetLocalEngagement(): void {
  try {
    window.localStorage.removeItem(eventsKey);
    window.localStorage.removeItem(actorKey);
  } catch {
    // The app can continue without local measurement.
  }
}

function readOrCreateActorId(): string {
  const stored = window.localStorage.getItem(actorKey);
  if (stored) return stored;
  const actorId = `actor-${crypto.randomUUID()}`;
  window.localStorage.setItem(actorKey, actorId);
  return actorId;
}

function isEngagementEvent(value: unknown): value is EngagementEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<EngagementEvent>;
  return Boolean(
    event.id &&
      event.anonymousActorId &&
      event.name &&
      allowedEvents.has(event.name) &&
      event.occurredAt &&
      !Number.isNaN(new Date(event.occurredAt).getTime()) &&
      event.appVersion,
  );
}
