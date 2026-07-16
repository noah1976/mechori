"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import {
  assessMediaPublishability,
  type MediaPrivacyState,
  type MediaPublishBlockReason,
} from "@mechori/core";
import { ArrowLeft, Check, Eye, RotateCcw, ScanLine, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const initialState: MediaPrivacyState = {
  assetKind: "original",
  metadataState: "removed",
  detectionState: "completed",
  manualReviewState: "pending",
  sensitiveRegions: [{ id: "demo-plate", kind: "license_plate", status: "detected" }],
};

export default function PrivacyReviewPage() {
  const { locale } = useApp();
  const [state, setState] = useState<MediaPrivacyState>(initialState);
  const ja = locale === "ja";
  const assessment = useMemo(() => assessMediaPublishability(state), [state]);
  const region = state.sensitiveRegions[0];
  const redacted = region?.status === "redacted";

  function applyMask() {
    setState((current) => ({
      ...current,
      assetKind: "redacted_derivative",
      manualReviewState: "pending",
      sensitiveRegions: current.sensitiveRegions.map((item) =>
        item.id === "demo-plate"
          ? { ...item, status: "redacted", redactionMethod: "solid_fill" }
          : item,
      ),
    }));
  }

  function confirmReview() {
    if (!redacted) return;
    setState((current) => ({ ...current, manualReviewState: "confirmed_redactions" }));
  }

  return <div className="page-stack narrow-page">
    <DemoNotice />
    <Link href="/import" className="back-link"><ArrowLeft size={17} />{ja ? "取り込みへ戻る" : "Back to import"}</Link>
    <header className="page-header"><div><span className="eyebrow">MEDIA PRIVACY DEMO</span><h1>{ja ? "画像の公開前チェック" : "Pre-publish image review"}</h1><p>{ja ? "DEMO画像上の仮想的な候補領域で、公開を止める安全設計を確認します。実際のナンバー検出ではありません。" : "This uses a simulated candidate region on a DEMO image to verify publish blocking. It is not real plate detection."}</p></div><button type="button" className="secondary-action" onClick={() => setState(initialState)}><RotateCcw size={17} />{ja ? "やり直す" : "Reset"}</button></header>

    <section className="privacy-review-layout">
      <div className="privacy-preview">
        <Image src="/demo-roadster.png" alt={ja ? "個人情報マスク確認用のDEMOロードスター" : "DEMO roadster for privacy-mask review"} fill sizes="(max-width: 760px) 100vw, 60vw" priority />
        <div className={`demo-sensitive-region ${redacted ? "is-redacted" : ""}`}><span>{redacted ? (ja ? "マスク済み" : "REDACTED") : (ja ? "DEMO ナンバー候補" : "DEMO PLATE CANDIDATE")}</span></div>
        <span className="simulation-label">SIMULATED REGION</span>
      </div>

      <div className="privacy-review-controls">
        <div className="review-status-row"><ScanLine size={20} /><div><strong>{ja ? "候補検出" : "Candidate detection"}</strong><small>{ja ? "DEMO完了 · 実検出なし" : "DEMO completed · No real detection"}</small></div><Check size={18} /></div>
        <div className="review-status-row"><ShieldAlert size={20} /><div><strong>{ja ? "位置情報・EXIF" : "Location and EXIF"}</strong><small>{ja ? "除去済み想定" : "Simulated as removed"}</small></div><Check size={18} /></div>
        <button type="button" className="primary-action full-action" onClick={applyMask} disabled={redacted}><ShieldAlert size={18} />{redacted ? (ja ? "候補をマスクしました" : "Candidate redacted") : (ja ? "候補にマスクを適用" : "Redact candidate")}</button>
        <button type="button" className="secondary-action full-action" onClick={confirmReview} disabled={!redacted || state.manualReviewState !== "pending"}><Eye size={18} />{state.manualReviewState === "confirmed_redactions" ? (ja ? "画像全体を確認済み" : "Full image reviewed") : (ja ? "画像全体を目視確認した" : "I reviewed the full image")}</button>
        <p className="review-guidance">{ja ? "自動検出だけでは公開できません。候補のマスク後も、顔・住所・ほかの車両のナンバー等が残っていないか人が確認します。" : "Automatic detection alone never permits publishing. After redaction, a person must check for faces, addresses, and other vehicle plates."}</p>
      </div>
    </section>

    <section className={`publish-gate ${assessment.publishable ? "is-ready" : "is-blocked"}`} aria-live="polite">
      <div>{assessment.publishable ? <Check size={24} /> : <ShieldAlert size={24} />}<span><strong>{assessment.publishable ? (ja ? "公開用データを作成可能" : "Publishable derivative can be created") : (ja ? "公開はブロック中" : "Publishing is blocked")}</strong><small>{ja ? "このDEMOではサーバー保存・公開を行いません。" : "This DEMO does not save to a server or publish anything."}</small></span></div>
      {!assessment.publishable && <ul>{assessment.reasons.map((reason) => <li key={reason}>{reasonLabel(reason, ja)}</li>)}</ul>}
    </section>
  </div>;
}

function reasonLabel(reason: MediaPublishBlockReason, ja: boolean) {
  const labels: Record<MediaPublishBlockReason, [string, string]> = {
    original_asset: ["公開用のマスク済み画像がまだありません", "No redacted derivative exists yet"],
    metadata_not_removed: ["位置情報などのメタデータが未除去です", "Metadata has not been removed"],
    detection_incomplete: ["個人情報候補の検出が未完了です", "Sensitive-content detection is incomplete"],
    manual_review_incomplete: ["画像全体の目視確認が未完了です", "Full-image manual review is incomplete"],
    unresolved_sensitive_region: ["未処理の個人情報候補があります", "A sensitive-content candidate is unresolved"],
    missing_redaction_method: ["マスク方法が記録されていません", "The redaction method is not recorded"],
  };
  return labels[reason][ja ? 0 : 1];
}
