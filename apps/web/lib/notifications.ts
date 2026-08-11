import type { SupportedUiLocale } from "@mechori/core";

export type NotificationType = "journal_like" | "profile_follow" | "journal_published";

export interface NotificationActor {
  id: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor?: NotificationActor;
  journalId?: string;
  vehicleLabel?: string;
  targetAvailable: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor?: NotificationCursor;
}

export interface NotificationTransportRow {
  notification_id: string;
  notification_type: NotificationType;
  actor_public_profile_id: string | null;
  actor_display_name: string | null;
  actor_public_username: string | null;
  journal_id: string | null;
  vehicle_label: string | null;
  target_available: boolean;
  created_at: string;
  read_at: string | null;
}

export function notificationBadgeLabel(unreadCount: number): string | undefined {
  if (!Number.isFinite(unreadCount) || unreadCount <= 0) return undefined;
  return unreadCount > 99 ? "99+" : String(Math.trunc(unreadCount));
}

export function notificationDestination(item: NotificationItem): string | undefined {
  if (!item.targetAvailable) return undefined;
  if (item.type === "profile_follow" && item.actor) {
    return `/profile/${encodeURIComponent(item.actor.publicUsername?.trim() || item.actor.id)}`;
  }
  return item.journalId ? `/journal/${encodeURIComponent(item.journalId)}` : undefined;
}

export function notificationMessage(
  item: NotificationItem,
  locale: SupportedUiLocale,
): string {
  if (!item.targetAvailable) {
    if (item.type === "profile_follow") {
      return locale === "ja" ? "新しいフォロワーがいます" : "You have a new follower";
    }
    return locale === "ja"
      ? "この記録は現在表示できません"
      : "This record is no longer available";
  }

  const name = item.actor?.displayName?.trim() || (locale === "ja" ? "MECHORIユーザー" : "A MECHORI user");
  if (item.type === "journal_like") {
    return locale === "ja"
      ? `${name}さんがあなたの記録にいいねしました`
      : `${name} liked your record`;
  }
  if (item.type === "profile_follow") {
    return locale === "ja"
      ? `${name}さんがあなたをフォローしました`
      : `${name} followed you`;
  }
  const vehicle = item.vehicleLabel?.trim() || (locale === "ja" ? "愛車" : "their vehicle");
  return locale === "ja"
    ? `${name}さんが${vehicle}の新しい記録を残しました`
    : `${name} added a new record for ${vehicle}`;
}

export function formatNotificationTimestamp(
  value: string,
  locale: SupportedUiLocale,
  now = new Date(),
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(locale === "ja" ? "ja" : "en", { numeric: "auto" });
  if (absoluteSeconds < 60) return formatter.format(seconds, "second");
  if (absoluteSeconds < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  if (absoluteSeconds < 604800) return formatter.format(Math.round(seconds / 86400), "day");
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function mergeNotificationPages(
  current: NotificationItem[],
  incoming: NotificationItem[],
): NotificationItem[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
}

export function markNotificationReadInList(
  items: NotificationItem[],
  notificationId: string,
  readAt: string,
): NotificationItem[] {
  return items.map((item) => item.id === notificationId && !item.readAt
    ? { ...item, readAt }
    : item);
}

export function markAllNotificationsReadInList(
  items: NotificationItem[],
  readAt: string,
): NotificationItem[] {
  return items.map((item) => item.readAt ? item : { ...item, readAt });
}

export function buildNotificationPage(
  rows: NotificationTransportRow[],
  images = new Map<string, string>(),
  pageSize = 20,
): NotificationPage {
  const items = rows.slice(0, pageSize).map((row): NotificationItem => ({
    id: row.notification_id,
    type: row.notification_type,
    actor: row.actor_public_profile_id && row.actor_display_name
      ? {
          id: row.actor_public_profile_id,
          displayName: row.actor_display_name,
          publicUsername: row.actor_public_username ?? undefined,
          profileImagePath: images.get(row.actor_public_profile_id),
        }
      : undefined,
    journalId: row.journal_id ?? undefined,
    vehicleLabel: row.vehicle_label ?? undefined,
    targetAvailable: row.target_available === true,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  }));
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > pageSize && last
      ? { createdAt: last.createdAt, id: last.id }
      : undefined,
  };
}
