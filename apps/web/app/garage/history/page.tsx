"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import {
  buildHistoryShareText,
  createAppDataExport,
  getPreferredVehicle,
  summarizeVehicleHistory,
  type HistoryLevelCode,
  type HistoryMilestoneCode,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  Archive,
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FileClock,
  Share2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const levelNames: Record<HistoryLevelCode, { ja: string; en: string }> = {
  not_started: { ja: "未登録", en: "Not started" },
  started: { ja: "記録を開始", en: "Started" },
  organized: { ja: "履歴を整理中", en: "Organized" },
  ongoing: { ja: "継続して記録", en: "Ongoing" },
};

const milestoneCopy: Record<HistoryMilestoneCode, { ja: string; en: string; detailJa: string; detailEn: string }> = {
  first_record: {
    ja: "最初の記録",
    en: "First record",
    detailJa: "愛車の履歴を残し始めました。",
    detailEn: "You started preserving this vehicle's history.",
  },
  multi_action_visit: {
    ja: "入庫をまとめて整理",
    en: "Visit organized",
    detailJa: "同じ入庫の複数作業をひとつに整理しました。",
    detailEn: "Multiple actions from one visit are kept together.",
  },
  result_recorded: {
    ja: "結果まで記録",
    en: "Result recorded",
    detailJa: "作業後の結果を履歴へ残しました。",
    detailEn: "A post-work result is preserved in the history.",
  },
  knowledge_candidate: {
    ja: "共有候補を提出",
    en: "Knowledge candidate",
    detailJa: "匿名化・運営確認へ進む候補があります。",
    detailEn: "A candidate is awaiting privacy and operator review.",
  },
  knowledge_shared: {
    ja: "知識として公開",
    en: "Knowledge shared",
    detailJa: "確認を経た記録が集合知に加わりました。",
    detailEn: "A reviewed record has joined shared knowledge.",
  },
};

function HistorySummaryContent() {
  const { data, locale, recordEngagement } = useApp();
  const params = useSearchParams();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const vehicle = data.vehicles.find((item) => item.id === params.get("vehicle")) ?? getPreferredVehicle(data.vehicles);
  const ja = locale === "ja";
  const snapshot = useMemo(
    () => (vehicle ? summarizeVehicleHistory(vehicle, data.records) : null),
    [data.records, vehicle],
  );
  useEffect(() => recordEngagement("history_reused"), [recordEngagement]);

  if (!vehicle || !snapshot) return null;

  const shareText = buildHistoryShareText(locale, vehicle, snapshot);
  const levelName = levelNames[snapshot.level][locale];

  function downloadData() {
    const exportedAt = new Date().toISOString();
    const payload = createAppDataExport(data, exportedAt);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mechori-owner-data-${exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyStatus("copied");
      return;
    } catch {
      const input = document.createElement("textarea");
      input.value = shareText;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      setCopyStatus(copied ? "copied" : "failed");
    }
  }

  return (
    <div className="page-stack">
      <DemoNotice />
      <Link href="/garage" className="back-link"><ArrowLeft size={17} />{ja ? "My Garageへ戻る" : "Back to My Garage"}</Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">OWNER VALUE</span>
          <h1>{translate(locale, "historySummary")}</h1>
          <p>{translate(locale, "historySummaryIntro")}</p>
        </div>
      </header>

      <section className="history-level-band" aria-labelledby="history-level-heading">
        <div>
          <span className="eyebrow">HISTORY {snapshot.levelNumber} / {snapshot.maximumLevelNumber}</span>
          <h2 id="history-level-heading">{translate(locale, "historyLevel")}: {levelName}</h2>
          <p>{translate(locale, "historyLevelNotice")}</p>
        </div>
        <div className="history-level-track" aria-label={`${snapshot.levelNumber} / ${snapshot.maximumLevelNumber}`}>
          {Array.from({ length: snapshot.maximumLevelNumber }, (_, index) => (
            <span key={index} className={index < snapshot.levelNumber ? "is-filled" : ""} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">PRIVATE BENEFIT</span><h2>{translate(locale, "ownerHistoryValue")}</h2></div></div>
        <div className="history-value-grid">
          <article><FileClock size={22} /><strong>{snapshot.recordCount}</strong><span>{translate(locale, "maintenanceVisits")}</span></article>
          <article><Wrench size={22} /><strong>{snapshot.actionCount}</strong><span>{translate(locale, "recordedActions")}</span></article>
          <article><Archive size={22} /><strong>{snapshot.partReferenceCount}</strong><span>{translate(locale, "partReferences")}</span></article>
          <article><ShieldCheck size={22} /><strong>{snapshot.unresolvedCount}</strong><span>{translate(locale, "unresolvedFollowups")}</span></article>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">MILESTONES</span><h2>{translate(locale, "historyMilestones")}</h2></div></div>
        <div className="milestone-grid">
          {snapshot.milestones.map((milestone) => {
            const copy = milestoneCopy[milestone.code];
            return (
              <article key={milestone.code} className={milestone.achieved ? "is-achieved" : ""}>
                <span className="milestone-icon">{milestone.achieved ? <Check size={19} /> : <Sparkles size={19} />}</span>
                <div><h3>{ja ? copy.ja : copy.en}</h3><p>{ja ? copy.detailJa : copy.detailEn}</p></div>
                <span className="badge badge-outline">{milestone.achieved ? (ja ? "達成" : "EARNED") : (ja ? "これから" : "NEXT")}</span>
              </article>
            );
          })}
        </div>
        <p className="legal-note">{ja ? "節目は自分の履歴整理を続けるための表示です。検索順位、整備能力、Professional認証、情報の信頼度には影響しません。" : "Milestones encourage personal record keeping. They do not affect search rank, mechanical skill, Professional verification, or information trust."}</p>
      </section>

      <section className="history-tools">
        <article>
          <Wrench size={23} />
          <div><h2>{translate(locale, "serviceBrief")}</h2><p>{translate(locale, "serviceBriefIntro")}</p></div>
          <Link href={`/garage/service-brief?vehicle=${encodeURIComponent(vehicle.id)}`} className="primary-action">{ja ? "表示する" : "Open"}</Link>
        </article>
        <article>
          <Download size={23} />
          <div><h2>{translate(locale, "exportOwnerData")}</h2><p>{translate(locale, "exportNotice")}</p></div>
          <button type="button" className="secondary-action" onClick={downloadData}><Download size={17} />JSON</button>
        </article>
        <article>
          <Share2 size={23} />
          <div><h2>{translate(locale, "sharePreview")}</h2><p>{translate(locale, "sharePrivacyNotice")}</p><blockquote>{shareText}</blockquote></div>
          <button type="button" className="secondary-action" onClick={() => void copyShareText()}>{copyStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}{copyStatus === "copied" ? translate(locale, "copied") : copyStatus === "failed" ? translate(locale, "copyFailed") : translate(locale, "copyShareText")}</button>
        </article>
      </section>
    </div>
  );
}

export default function HistorySummaryPage() {
  return <Suspense fallback={<div className="page-stack" />}><HistorySummaryContent /></Suspense>;
}
