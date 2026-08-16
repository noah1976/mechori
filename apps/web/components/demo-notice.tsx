"use client";

import { translate } from "@mechori/i18n";
import { FlaskConical } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  return (
    <div className={`demo-notice${compact ? " is-compact" : ""}`} role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>{isRemoteAlpha ? "ALPHA" : translate(locale, "demo")}</strong>
        <span>
          {isRemoteAlpha
            ? ja
              ? "MECHORIは現在α版です。Quick Recordはα参加者に共有されます。個人情報や写真の写り込みに注意してください。"
              : "MECHORI is currently in alpha. Quick Records are shared with alpha participants. Please avoid personal details and sensitive content in photos."
            : translate(locale, "demoNotice")}
        </span>
      </div>
    </div>
  );
}
