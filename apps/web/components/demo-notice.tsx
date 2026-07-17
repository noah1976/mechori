"use client";

import { translate } from "@mechori/i18n";
import { FlaskConical } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function DemoNotice() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  return (
    <div className="demo-notice" role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>{isRemoteAlpha ? "ALPHA" : translate(locale, "demo")}</strong>
        <span>
          {isRemoteAlpha
            ? ja
              ? "少人数テスト中です。愛車と整備履歴はあなた専用の非公開領域へ保存されます。"
              : "This is a small alpha test. Your vehicles and maintenance history are stored in your private workspace."
            : translate(locale, "demoNotice")}
        </span>
      </div>
    </div>
  );
}
