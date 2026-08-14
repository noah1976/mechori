import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildNotificationPage,
  markAllNotificationsReadInList,
  markNotificationReadInList,
  mergeNotificationPages,
  notificationBadgeLabel,
  notificationDestination,
  notificationMessage,
  type NotificationItem,
  type NotificationTransportRow,
} from "../lib/notifications.ts";

function row(overrides: Partial<NotificationTransportRow> = {}): NotificationTransportRow {
  return {
    notification_id: "00000000-0000-4000-8000-000000000001",
    notification_type: "journal_like",
    actor_public_profile_id: "00000000-0000-4000-8000-000000000002",
    actor_display_name: "Tomoyo",
    actor_public_username: "tomoyo",
    journal_id: "journal-1",
    vehicle_label: "Fiat Barchetta",
    target_available: true,
    created_at: "2026-08-11T10:00:00.000Z",
    read_at: null,
    ...overrides,
  };
}

test("notification rows preserve actor image, target and unread state through the final UI contract", () => {
  const imagePath = "00000000-0000-4000-8000-000000000003/avatar-main.webp";
  const page = buildNotificationPage([row()], new Map([
    ["00000000-0000-4000-8000-000000000002", imagePath],
  ]));
  assert.equal(page.items.length, 1);
  assert.deepEqual(page.items[0]?.actor, {
    id: "00000000-0000-4000-8000-000000000002",
    displayName: "Tomoyo",
    publicUsername: "tomoyo",
    profileImagePath: imagePath,
  });
  assert.equal(page.items[0]?.readAt, undefined);
  assert.equal(notificationMessage(page.items[0]!, "ja"), "Tomoyoさんがあなたの記録にいいねしました");
  assert.equal(notificationDestination(page.items[0]!), "/journal/journal-1");
});

test("notification messages and destinations are type-specific and privacy-safe", () => {
  const follow = buildNotificationPage([row({
    notification_type: "profile_follow",
    journal_id: null,
    vehicle_label: null,
  })]).items[0]!;
  assert.equal(notificationMessage(follow, "ja"), "Tomoyoさんがあなたをフォローしました");
  assert.equal(notificationDestination(follow), "/profile/tomoyo");

  const published = buildNotificationPage([row({ notification_type: "journal_published" })]).items[0]!;
  assert.equal(notificationMessage(published, "ja"), "TomoyoさんがFiat Barchettaの新しい記録を残しました");

  const inaccessible = buildNotificationPage([row({
    journal_id: null,
    vehicle_label: null,
    target_available: false,
  })]).items[0]!;
  assert.equal(notificationMessage(inaccessible, "ja"), "この記録は現在表示できません");
  assert.equal(notificationDestination(inaccessible), undefined);
});

test("notification pagination is newest-first, bounded to 20, and exposes a stable cursor", () => {
  const rows = Array.from({ length: 21 }, (_, index) => row({
    notification_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    created_at: new Date(Date.UTC(2026, 7, 11, 10, 0, 21 - index)).toISOString(),
  }));
  const page = buildNotificationPage(rows);
  assert.equal(page.items.length, 20);
  assert.deepEqual(page.nextCursor, {
    createdAt: rows[19]!.created_at,
    id: rows[19]!.notification_id,
  });
});

test("notification pages deduplicate stable IDs and badge labels cap at 99+", () => {
  const first = buildNotificationPage([row()]).items[0]!;
  const duplicate = { ...first, readAt: "2026-08-11T11:00:00.000Z" };
  const second: NotificationItem = { ...first, id: "notification-2" };
  assert.deepEqual(mergeNotificationPages([first], [duplicate, second]), [first, second]);
  assert.equal(notificationBadgeLabel(0), undefined);
  assert.equal(notificationBadgeLabel(1), "1");
  assert.equal(notificationBadgeLabel(99), "99");
  assert.equal(notificationBadgeLabel(100), "99+");
});

test("individual and mark-all read updates preserve the list and do not affect unrelated rows", () => {
  const first = buildNotificationPage([row()]).items[0]!;
  const second = { ...first, id: "notification-2" };
  const readAt = "2026-08-11T12:00:00.000Z";
  const oneRead = markNotificationReadInList([first, second], first.id, readAt);
  assert.equal(oneRead[0]?.readAt, readAt);
  assert.equal(oneRead[1]?.readAt, undefined);
  assert.deepEqual(markAllNotificationsReadInList(oneRead, readAt).map((item) => item.readAt), [readAt, readAt]);
});

test("notification shell fetches only unread count globally and full rows on the notification route", () => {
  const provider = readFileSync(new URL("../components/notification-provider.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/notifications/page.tsx", import.meta.url), "utf8");
  assert.match(provider, /loadAlphaUnreadNotificationCount/);
  assert.doesNotMatch(provider, /loadAlphaNotifications/);
  assert.match(page, /loadAlphaNotifications/);
  assert.match(page, /ProfileAvatar/);
  assert.match(page, /markAllAlphaNotificationsRead/);
});
