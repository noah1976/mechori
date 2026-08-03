"use client";

import { useApp } from "@/lib/app-context";
import { submitAlphaFeedback, type AlphaFeedbackKind } from "@/lib/alpha-operations";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { translate } from "@mechori/i18n";
import { Check, ClipboardCopy, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

const feedbackKinds = ["liked", "confusing", "broken", "missing", "other"] as const satisfies readonly AlphaFeedbackKind[];
type FeedbackKind = (typeof feedbackKinds)[number];

export default function FeedbackPage() {
  const { locale } = useApp();
  const [kind, setKind] = useState<FeedbackKind>("confusing");
  const [where, setWhere] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<"" | "failed" | "rate">("");
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!details.trim()) return;
    setSaving(true);
    setError("");
    try {
      await submitAlphaFeedback({
        kind,
        content: feedbackText,
        pagePath: new URLSearchParams(window.location.search).get("from") || window.location.pathname,
        appBuild: process.env.NEXT_PUBLIC_COMMIT_REF ?? process.env.NEXT_PUBLIC_CONTEXT ?? "",
        userAgent: navigator.userAgent,
      });
      pushAnalyticsEvent("feedback_submitted", { feedback_kind: kind });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error && saveError.message === "feedback_rate_limited" ? "rate" : "failed");
    } finally {
      setSaving(false);
    }
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

      {saved ? (
        <section className="report-success" role="status">
          <Check size={25} aria-hidden="true" />
          <div>
            <h1>{locale === "ja" ? "フィードバックを受け取りました" : "Feedback received"}</h1>
            <p>{locale === "ja" ? "α版を一緒に育てる材料として確認します。ありがとうございます。" : "Thank you. We will use it to improve the alpha together."}</p>
          </div>
        </section>
      ) : <form className="record-form" onSubmit={submit} noValidate>
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

        {error && <p className="form-error-summary" role="alert">
          {error === "rate"
            ? locale === "ja" ? "短時間の送信上限に達しました。10分ほど待ってからお試しください。" : "The short-term submission limit was reached. Try again in about 10 minutes."
            : locale === "ja" ? "送信できませんでした。内容をコピーして、時間をおいてもう一度お試しください。" : "Feedback could not be sent. Copy it and try again shortly."}
        </p>}

        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => void copyFeedback()}>
            {copied ? <Check size={18} /> : <ClipboardCopy size={18} />}
            {translate(locale, copied ? "copiedFeedback" : "copyFeedback")}
          </button>
          <button type="submit" className="primary-action" disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
            {saving ? (locale === "ja" ? "送信中" : "Sending") : (locale === "ja" ? "MECHORIへ送る" : "Send to MECHORI")}
          </button>
        </div>
      </form>}
    </div>
  );
}

function feedbackKindLabel(kind: FeedbackKind, locale: "ja" | "en"): string {
  if (kind === "other") return locale === "ja" ? "その他" : "Other";
  const keys = {
    liked: "feedbackLiked",
    confusing: "feedbackConfusing",
    broken: "feedbackBroken",
    missing: "feedbackMissing",
  } as const;
  return translate(locale, keys[kind]);
}
