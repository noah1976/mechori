"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/app-shell";
import { NotificationProvider } from "@/components/notification-provider";

export function ApplicationFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // QA never mounts the authenticated workspace, notifications or onboarding,
  // including when the visitor already has an active alpha session.
  if (pathname === "/qa") return <main>{children}</main>;
  return <AppProvider><NotificationProvider><AppShell>{children}</AppShell></NotificationProvider></AppProvider>;
}
