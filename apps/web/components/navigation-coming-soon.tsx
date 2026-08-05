"use client";

import { ArrowLeft, Bell, Link2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";

export function NavigationComingSoon({ kind }: { kind: "notifications" | "connections" | "help" | "terms" }) {
  const { locale } = useApp();
  const ja = locale === "ja";
  const content = {
    notifications: { title: ja ? "通知" : "Notifications", body: ja ? "通知センターは準備中です。" : "Notifications are coming soon.", icon: Bell },
    connections: { title: ja ? "つながり" : "Connections", body: ja ? "つながりの管理は準備中です。" : "Connection management is coming soon.", icon: Link2 },
    help: { title: ja ? "ヘルプ" : "Help", body: ja ? "ヘルプは準備中です。" : "Help is coming soon.", icon: Link2 },
    terms: { title: ja ? "利用規約" : "Terms", body: ja ? "利用規約ページは準備中です。" : "The terms page is coming soon.", icon: Link2 },
  }[kind] as { title: string; body: string; icon: LucideIcon };
  const Icon = content.icon;

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">MECHORI</span>
          <h1>{content.title}</h1>
          <p>{content.body}</p>
        </div>
        <Icon size={30} aria-hidden="true" />
      </header>
      <Link href="/" className="secondary-action"><ArrowLeft size={17} aria-hidden="true" />{ja ? "ホームへ戻る" : "Back home"}</Link>
    </div>
  );
}
