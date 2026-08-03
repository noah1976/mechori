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
              ? "MECHORIは現在α版です。表示名とプロフィールは参加者から閲覧でき、愛車や投稿は保存時に選んだ公開範囲で表示されます。個人情報や写真の写り込みに注意してください。"
              : "MECHORI is currently in alpha. Your display name and profile are visible to participants, while vehicles and posts follow the visibility selected when saved. Please avoid personal details and sensitive content in photos."
            : translate(locale, "demoNotice")}
        </span>
      </div>
    </div>
  );
}
