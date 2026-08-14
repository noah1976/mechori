"use client";

import { loadAlphaUnreadNotificationCount } from "@/lib/alpha-notifications";
import { useApp } from "@/lib/app-context";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface NotificationContextValue {
  unreadCount: number | null;
  refreshUnreadCount(): Promise<void>;
  markOneReadLocally(): void;
  markAllReadLocally(): void;
}

const inactiveValue: NotificationContextValue = {
  unreadCount: null,
  refreshUnreadCount: async () => undefined,
  markOneReadLocally: () => undefined,
  markAllReadLocally: () => undefined,
};

const NotificationContext = createContext<NotificationContextValue>(inactiveValue);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { hydrated, signedIn, isRemoteAlpha, authSession } = useApp();
  const pathname = usePathname();
  if (!hydrated || !signedIn || !isRemoteAlpha || authSession.status !== "signed_in") {
    return <NotificationContext.Provider value={inactiveValue}>{children}</NotificationContext.Provider>;
  }
  return (
    <AuthenticatedNotificationProvider key={authSession.profileId} refreshKey={pathname}>
      {children}
    </AuthenticatedNotificationProvider>
  );
}

function AuthenticatedNotificationProvider({
  children,
  refreshKey,
}: {
  children: ReactNode;
  refreshKey: string;
}) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await loadAlphaUnreadNotificationCount());
    } catch {
      setUnreadCount(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadAlphaUnreadNotificationCount()
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch(() => {
        if (active) setUnreadCount(null);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const value = useMemo<NotificationContextValue>(() => ({
    unreadCount,
    refreshUnreadCount,
    markOneReadLocally: () => setUnreadCount((count) => count === null ? null : Math.max(0, count - 1)),
    markAllReadLocally: () => setUnreadCount(0),
  }), [refreshUnreadCount, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
