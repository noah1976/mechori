"use client";

import { useApp } from "@/lib/app-context";
import { translate } from "@mechori/i18n";
import { Check, ClipboardCopy, Mail, MessageSquareText } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

const feedbackKinds = ["liked", "confusing", "broken", "missing"] as const;
type FeedbackKind = (typeof feedbackKinds)[number];

export default function FeedbackPage() {
  const { locale } = useApp();
  const [kind, setKind] = useState<FeedbackKind>("confusing");
  const [where, setWhere] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const kindLabel = feedbackKindLabel(kind, locale);
  const feedbackText = useMemo(
    () => [
      `MECHORI alpha feedback: ${kindLabel}`,
      "",
      `${translate(locale, "feedbackWhere")}: ${where.trim() || "-"}`,
      "",
      translate(locale, "feedbackDetails"),
      details.trim(),
    ].join("\n"),
    [details, kindLabel, locale, where],
  );
  const mailto = `mailto:info@mechori.com?subject=${encodeURIComponent(`[MECHORI alpha] ${kindLabel}`)}&body=${encodeURIComponent(feedbackText)}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!details.trim()) return;
    window.location.href = mailto;
  }

  async function copyFeedback() {
    if (!details.trim()) {
      setSubmitted(true);
      return;
    }
    await navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ALPHA FEEDBACK</span>
          <h1>{translate(locale, "feedbackTitle")}</h1>
          <p>{translate(locale, "feedbackIntro")}</p>
        </div>
        <MessageSquareText size={30} aria-hidden="true" />
      </header>

      <form className="record-form" onSubmit={submit} noValidate>
        <section className="form-section">
          <fieldset className="feedback-kind-fields">
            <legend>{translate(locale, "feedbackType")}</legend>
            <div className="feedback-kind-picker">
              {feedbackKinds.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={kind === value ? "is-selected" : ""}
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                >
                  {feedbackKindLabel(value, locale)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>{translate(locale, "feedbackWhere")}</span>
            <input
              value={where}
              maxLength={120}
              onChange={(event) => setWhere(event.target.value)}
              placeholder={translate(locale, "feedbackWherePlaceholder")}
            />
          </label>

          <label className={`field ${submitted && !details.trim() ? "has-error" : ""}`}>
            <span>{translate(locale, "feedbackDetails")} *</span>
            <textarea
              rows={7}
              value={details}
              maxLength={2000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={translate(locale, "feedbackDetailsPlaceholder")}
            />
            {submitted && !details.trim() && <small>{translate(locale, "feedbackRequired")}</small>}
          </label>
        </section>

        <p className="privacy-caption">{translate(locale, "feedbackPrivacyNotice")}</p>

        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => void copyFeedback()}>
            {copied ? <Check size={18} /> : <ClipboardCopy size={18} />}
            {translate(locale, copied ? "copiedFeedback" : "copyFeedback")}
          </button>
          <button type="submit" className="primary-action">
            <Mail size={18} />
            {translate(locale, "openEmail")}
          </button>
        </div>
      </form>
    </div>
  );
}

function feedbackKindLabel(kind: FeedbackKind, locale: "ja" | "en"): string {
  const keys = {
    liked: "feedbackLiked",
    confusing: "feedbackConfusing",
    broken: "feedbackBroken",
    missing: "feedbackMissing",
  } as const;
  return translate(locale, keys[kind]);
}
