"use client";

import { translate } from "@mechori/i18n";
import type { SupportedUiLocale } from "@mechori/core";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function WorkshopIntroductionActions({
  locale,
}: {
  locale: SupportedUiLocale;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  function professionalUrl(): string {
    if (typeof window === "undefined") return "/professional?ref=owner";
    return `${window.location.origin}/professional?ref=owner`;
  }

  async function shareIntroduction() {
    const url = professionalUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MECHORI Professional",
          text: translate(locale, "professionalIntroductionShareText"),
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyIntroduction();
  }

  async function copyIntroduction() {
    const url = professionalUrl();
    try {
      await navigator.clipboard.writeText(
        translate(locale, "professionalIntroductionText", { url }),
      );
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="workshop-introduction-actions">
      <button type="button" className="primary-action" onClick={shareIntroduction}>
        <Share2 size={17} aria-hidden="true" />
        {translate(locale, "shareProfessionalPage")}
      </button>
      <button type="button" className="secondary-action" onClick={copyIntroduction}>
        {status === "copied" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        {status === "copied"
          ? translate(locale, "professionalIntroductionCopied")
          : translate(locale, "copyProfessionalIntroduction")}
      </button>
      <Link href="/professional?ref=owner" className="text-link">
        {translate(locale, "professionalLink")}
        <ExternalLink size={15} aria-hidden="true" />
      </Link>
      {status === "error" && (
        <p role="alert">{translate(locale, "professionalIntroductionCopyFailed")}</p>
      )}
    </div>
  );
}
