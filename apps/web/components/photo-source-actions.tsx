"use client";

import type { SupportedUiLocale } from "@mechori/core";
import { Camera, Images } from "lucide-react";
import type { ChangeEventHandler } from "react";

export function PhotoSourceActions({
  locale,
  disabled = false,
  preparing = false,
  onChange,
}: {
  locale: SupportedUiLocale;
  disabled?: boolean;
  preparing?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  const preparingLabel = locale === "ja" ? "写真を準備中" : "Preparing photo";

  return (
    <div className="photo-source-actions" aria-busy={preparing}>
      <label className="photo-pick-action">
        <Camera size={18} aria-hidden="true" />
        {preparing ? preparingLabel : locale === "ja" ? "カメラで撮る" : "Take a photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          disabled={disabled}
        />
      </label>
      <label className="photo-pick-action">
        <Images size={18} aria-hidden="true" />
        {preparing ? preparingLabel : locale === "ja" ? "写真から選ぶ" : "Choose from photos"}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
