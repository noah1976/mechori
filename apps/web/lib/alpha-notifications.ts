import { loadAlphaPublicProfileImages } from "@/lib/alpha-public-owners";
import {
  buildNotificationPage,
  type NotificationCursor,
  type NotificationPage,
  type NotificationTransportRow,
} from "@/lib/notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const notificationPageSize = 20;

export async function loadAlphaNotifications(
  cursor?: NotificationCursor,
): Promise<NotificationPage> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_my_alpha_notifications",
    {
      p_before_created_at: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: notificationPageSize + 1,
    },
  );
  if (error) throw new Error("alpha_notifications_load_failed");

  const rows = (data ?? []) as NotificationTransportRow[];
  const visibleRows = rows.slice(0, notificationPageSize);
  const actorIds = visibleRows
    .map((row) => row.actor_public_profile_id)
    .filter((id): id is string => Boolean(id));
  const images = await loadAlphaPublicProfileImages(actorIds);
  return buildNotificationPage(rows, images, notificationPageSize);
}

export async function loadAlphaUnreadNotificationCount(): Promise<number> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "count_my_unread_alpha_notifications",
  );
  if (error) throw new Error("alpha_notification_count_load_failed");
  return Math.max(0, Number(data) || 0);
}

export async function markAlphaNotificationRead(notificationId: string): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "mark_alpha_notification_read",
    { p_notification_id: notificationId },
  );
  if (error || data !== true) throw new Error("alpha_notification_read_failed");
}

export async function markAllAlphaNotificationsRead(): Promise<number> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "mark_all_alpha_notifications_read",
  );
  if (error) throw new Error("alpha_notifications_read_all_failed");
  return Math.max(0, Number(data) || 0);
}
