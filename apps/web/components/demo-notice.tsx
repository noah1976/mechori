"use client";

import { translate } from "@mechori/i18n";
import { FlaskConical } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function DemoNotice() {
  const { locale } = useApp();
  return (
    <div className="demo-notice" role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>{translate(locale, "demo")}</strong>
        <span>{translate(locale, "demoNotice")}</span>
      </div>
    </div>
  );
}
