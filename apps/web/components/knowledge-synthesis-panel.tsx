import type {
  EvidenceBoundItem,
  KnowledgeSynthesis,
  Locale,
  VehicleMatchLevel,
} from "@mechory/core";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { HazardBadge, VerificationBadge } from "./status-badges";

function EvidenceList({
  items,
  emptyLabel,
  locale,
}: {
  items: EvidenceBoundItem[];
  emptyLabel: string;
  locale: Locale;
}) {
  if (items.length === 0) return <p className="synthesis-none">{emptyLabel}</p>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.text}>
          <strong>{item.text}</strong>
          <small>
            {locale === "ja"
              ? `独立した報告 ${item.independentReportCount}件`
              : `${item.independentReportCount} independent report(s)`}
          </small>
        </li>
      ))}
    </ul>
  );
}

function matchLabel(level: VehicleMatchLevel, ja: boolean) {
  const labels: Record<VehicleMatchLevel, [string, string]> = {
    exact_specification: ["同一仕様", "Exact specification"],
    same_model_other_year: ["同車種・別年式", "Same model, other year"],
    shared_engine_or_component: ["共通エンジン・部品", "Shared engine or component"],
    general_symptom: ["一般的な類似症状", "General similar symptom"],
  };
  return labels[level][ja ? 0 : 1];
}

export function KnowledgeSynthesisPanel({
  synthesis,
  locale,
}: {
  synthesis: KnowledgeSynthesis;
  locale: Locale;
}) {
  const ja = locale === "ja";

  if (synthesis.insufficientEvidence) {
    return (
      <section className="synthesis-empty" aria-live="polite">
        <SearchCheck size={24} />
        <div>
          <strong>{ja ? "公開ナレッジに一致する根拠がありません" : "No matching public evidence"}</strong>
          <p>{ja ? "検索範囲を広げても、見つからないことを隠しません。" : "MECHORY does not hide an evidence gap with a generated answer."}</p>
        </div>
      </section>
    );
  }

  const firstCheck = synthesis.reportedChecks[0]?.text;
  const firstCause = synthesis.reportedCauseCandidates[0]?.text;
  const firstAction = synthesis.reportedActions[0]?.text;
  const firstPart = synthesis.reportedParts[0]?.text;
  const summarySegments = ja
    ? [
        firstCheck ? `投稿群では、まず「${firstCheck}」を確認した報告があります。` : null,
        firstCause ? `原因候補として「${firstCause}」が挙げられています。` : null,
        firstAction ? `その後の対応では「${firstAction}」という報告があります。` : null,
        firstPart ? `交換部品として「${firstPart}」が記録されています。` : null,
      ]
    : [
        firstCheck ? `The source posts report checking “${firstCheck}” first.` : null,
        firstCause ? `“${firstCause}” appears as a possible cause.` : null,
        firstAction ? `A reported response was “${firstAction}.”` : null,
        firstPart ? `“${firstPart}” appears in the recorded replacement parts.` : null,
      ];

  return (
    <section className="synthesis-section" aria-labelledby="synthesis-heading">
      <header className="synthesis-header">
        <div>
          <span className="eyebrow">AI SUMMARY DEMO</span>
          <h2 id="synthesis-heading">{ja ? "みんなの記録から考えられること" : "What the shared records suggest"}</h2>
          <p>{ja ? `${synthesis.includedCaseIds.length}件のDEMO投稿・事例だけを根拠に整理しています。` : `Summarized only from ${synthesis.includedCaseIds.length} DEMO post(s) and case(s).`}</p>
        </div>
        <HazardBadge level={synthesis.hazardPolicy.effectiveLevel} />
      </header>

      <div className="synthesis-answer">
        <Sparkles size={22} aria-hidden="true" />
        <p>{summarySegments.filter(Boolean).join(" ")}</p>
      </div>

      {synthesis.hazardPolicy.requiresExpertConfirmation ? (
        <div className="synthesis-warning">
          <AlertTriangle size={20} />
          <p>{ja ? "重大な安全情報を含む可能性があります。具体的作業を推奨せず、専門家と整備書の確認が必要です。" : "This may include critical safety information. It does not recommend a repair procedure; expert and service-manual confirmation is required."}</p>
        </div>
      ) : null}

      <div className="synthesis-columns synthesis-columns-four">
        <article><span>01</span><div><h3>{ja ? "確認された箇所" : "Reported checks"}</h3><EvidenceList items={synthesis.reportedChecks} emptyLabel={ja ? "該当する報告なし" : "No reported check"} locale={locale} /></div></article>
        <article><span>02</span><div><h3>{ja ? "原因候補" : "Possible causes"}</h3><EvidenceList items={synthesis.reportedCauseCandidates} emptyLabel={ja ? "原因候補の報告なし" : "No possible cause reported"} locale={locale} /></div></article>
        <article><span>03</span><div><h3>{ja ? "対応・交換部品" : "Responses and parts"}</h3><EvidenceList items={[...synthesis.reportedActions, ...synthesis.reportedParts]} emptyLabel={ja ? "対応報告なし" : "No reported response"} locale={locale} /></div></article>
        <article><span>04</span><div><h3>{ja ? "結果の内訳" : "Outcome range"}</h3><dl><div><dt>{ja ? "改善" : "Improved"}</dt><dd>{synthesis.outcomes.improved}</dd></div><div><dt>{ja ? "未解決" : "Unresolved"}</dt><dd>{synthesis.outcomes.unresolved}</dd></div><div><dt>{ja ? "変化なし・悪化" : "No change / worsened"}</dt><dd>{synthesis.outcomes.no_change + synthesis.outcomes.worsened}</dd></div></dl></div></article>
      </div>

      <div className="synthesis-sources">
        <div className="section-heading compact-heading">
          <div><span className="eyebrow">SOURCES</span><h3>{ja ? "この要約の出典" : "Sources for this summary"}</h3></div>
        </div>
        <div className="synthesis-source-list">
          {synthesis.sources.map((source) => (
            <Link href={source.href} key={source.caseId}>
              <div><strong>{source.title}</strong><span>{matchLabel(source.matchLevel, ja)}</span></div>
              <VerificationBadge value={source.verificationStatus} locale={locale} />
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <footer className="synthesis-footer">
        <BookOpenCheck size={18} />
        <span>{ja ? "投稿から確認できる範囲の整理であり、診断や修理指示ではありません。出典を開いて前提や未解決例も確認できます。" : "This is evidence-bound organization, not a diagnosis or repair instruction. Open the sources to review context and unresolved cases."}</span>
      </footer>
    </section>
  );
}
