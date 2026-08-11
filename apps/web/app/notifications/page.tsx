"use client";

import { Bell, CheckCheck, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useNotifications } from "@/components/notification-provider";
import {
  loadAlphaNotifications,
  markAllAlphaNotificationsRead,
  markAlphaNotificationRead,
} from "@/lib/alpha-notifications";
import { useApp } from "@/lib/app-context";
import {
  formatNotificationTimestamp,
  markAllNotificationsReadInList,
  markNotificationReadInList,
  mergeNotificationPages,
  notificationDestination,
  notificationMessage,
  type NotificationCursor,
  type NotificationItem,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const { hydrated, signedIn, isRemoteAlpha, authSession, locale } = useApp();
  if (!hydrated || !signedIn || authSession.status !== "signed_in") {
    return <NotificationLoading locale={locale} />;
  }
  if (!isRemoteAlpha) {
    return <NotificationEmpty locale={locale} />;
  }
  return <NotificationCenter key={authSession.profileId} locale={locale} />;
}

function NotificationCenter({ locale }: { locale: "ja" | "en" }) {
  const router = useRouter();
  const {
    unreadCount: totalUnreadCount,
    markOneReadLocally,
    markAllReadLocally,
    refreshUnreadCount,
  } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<NotificationCursor | undefined>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAlphaNotifications()
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  async function retry() {
    setState("loading");
    setActionError(false);
    try {
      const page = await loadAlphaNotifications();
      setItems(page.items);
      setCursor(page.nextCursor);
      setState("ready");
      await refreshUnreadCount();
    } catch {
      setState("error");
    }
  }

  function openNotification(item: NotificationItem) {
    const destination = notificationDestination(item);
    if (!item.readAt) {
      const readAt = new Date().toISOString();
      setItems((current) => markNotificationReadInList(current, item.id, readAt));
      markOneReadLocally();
      void markAlphaNotificationRead(item.id).catch(() => {
        setActionError(true);
        void refreshUnreadCount();
      });
    }
    if (destination) router.push(destination);
  }

  async function markAllRead() {
    setMarkingAll(true);
    setActionError(false);
    try {
      await markAllAlphaNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => markAllNotificationsReadInList(current, readAt));
      markAllReadLocally();
    } catch {
      setActionError(true);
    } finally {
      setMarkingAll(false);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setActionError(false);
    try {
      const page = await loadAlphaNotifications(cursor);
      setItems((current) => mergeNotificationPages(current, page.items));
      setCursor(page.nextCursor);
    } catch {
      setActionError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (state === "loading") return <NotificationLoading locale={locale} />;
  if (state === "error") {
    return (
      <section className="notification-page narrow-page" aria-labelledby="notification-title">
        <NotificationHeader locale={locale} />
        <div className="notification-state" role="alert">
          <Bell size={24} aria-hidden="true" />
          <strong>{locale === "ja" ? "通知を取得できませんでした" : "Notifications could not be loaded"}</strong>
          <button type="button" className="secondary-action" onClick={() => void retry()}>
            <RefreshCw size={17} aria-hidden="true" />
            {locale === "ja" ? "もう一度試す" : "Try again"}
          </button>
        </div>
      </section>
    );
  }

  const unreadCount = items.filter((item) => !item.readAt).length;
  return (
    <section className="notification-page narrow-page" aria-labelledby="notification-title" aria-busy={loadingMore || markingAll}>
      <NotificationHeader locale={locale}>
        <button
          type="button"
          className="text-action notification-mark-all"
          disabled={(totalUnreadCount ?? unreadCount) === 0 || markingAll}
          onClick={() => void markAllRead()}
        >
          {markingAll ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <CheckCheck size={17} aria-hidden="true" />}
          {locale === "ja" ? "すべて既読" : "Mark all read"}
        </button>
      </NotificationHeader>

      {actionError && (
        <p className="form-error notification-action-error" role="alert">
          {locale === "ja" ? "通知の更新に失敗しました。もう一度お試しください。" : "The notification could not be updated. Please try again."}
        </p>
      )}

      {items.length === 0 ? <NotificationEmpty locale={locale} compact /> : (
        <div className="notification-list">
          {items.map((item) => {
            const destination = notificationDestination(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`notification-row${item.readAt ? "" : " is-unread"}`}
                onClick={() => openNotification(item)}
              >
                <ProfileAvatar
                  displayName={item.actor?.displayName ?? "MECHORI"}
                  imagePath={item.actor?.profileImagePath}
                  className="profile-avatar notification-avatar"
                />
                <span className="notification-copy">
                  <strong>{notificationMessage(item, locale)}</strong>
                  <time dateTime={item.createdAt}>{formatNotificationTimestamp(item.createdAt, locale)}</time>
                </span>
                {!item.readAt && <span className="notification-unread-dot" aria-label={locale === "ja" ? "未読" : "Unread"} />}
                {destination && <ChevronRight size={18} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {cursor && (
        <button type="button" className="secondary-action notification-load-more" disabled={loadingMore} onClick={() => void loadMore()}>
          {loadingMore && <LoaderCircle className="spin" size={17} aria-hidden="true" />}
          {locale === "ja" ? "さらに読み込む" : "Load more"}
        </button>
      )}
    </section>
  );
}

function NotificationHeader({
  locale,
  children,
}: {
  locale: "ja" | "en";
  children?: ReactNode;
}) {
  return (
    <header className="notification-header">
      <div>
        <span className="eyebrow">MECHORI</span>
        <h1 id="notification-title">{locale === "ja" ? "通知" : "Notifications"}</h1>
      </div>
      {children}
    </header>
  );
}

function NotificationLoading({ locale }: { locale: "ja" | "en" }) {
  return (
    <section className="notification-page narrow-page" aria-labelledby="notification-title">
      <NotificationHeader locale={locale} />
      <div className="notification-state" role="status" aria-live="polite">
        <LoaderCircle className="spin" size={24} aria-hidden="true" />
        <span>{locale === "ja" ? "通知を読み込んでいます" : "Loading notifications"}</span>
      </div>
    </section>
  );
}

function NotificationEmpty({ locale, compact = false }: { locale: "ja" | "en"; compact?: boolean }) {
  const state = (
    <div className="notification-state">
      <Bell size={24} aria-hidden="true" />
      <strong>{locale === "ja" ? "まだ通知はありません" : "No notifications yet"}</strong>
    </div>
  );
  if (compact) return state;
  return (
    <section className="notification-page narrow-page" aria-labelledby="notification-title">
      <NotificationHeader locale={locale} />
      {state}
    </section>
  );
}
