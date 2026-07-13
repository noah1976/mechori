import type { KnowledgeSynthesis, Locale } from "@mechory/core";
import { AlertTriangle, BookOpenCheck, SearchCheck } from "lucide-react";

import { HazardBadge } from "./status-badges";

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

  const independentReports = Math.max(
    0,
    ...synthesis.reportedCauseCandidates.map((item) => item.independentReportCount),
  );

  return (
    <section className="synthesis-section" aria-labelledby="synthesis-heading">
      <header className="synthesis-header">
        <div>
          <span className="eyebrow">DEMO KNOWLEDGE SYNTHESIS</span>
          <h2 id="synthesis-heading">{ja ? "集合知から分かった範囲" : "What the shared evidence says"}</h2>
          <p>{ja ? `${synthesis.includedCaseIds.length}件のDEMO事例を根拠として整理しています。実在する整備情報ではありません。` : `Organized from ${synthesis.includedCaseIds.length} DEMO cases. This is not real maintenance information.`}</p>
        </div>
        <HazardBadge level={synthesis.hazardPolicy.effectiveLevel} />
      </header>

      {synthesis.hazardPolicy.requiresExpertConfirmation ? (
        <div className="synthesis-warning">
          <AlertTriangle size={20} />
          <p>{ja ? "重大な安全情報を含む可能性があります。具体的作業を推奨せず、専門家と整備書の確認が必要です。" : "This may include critical safety information. It does not recommend a repair procedure; expert and service-manual confirmation is required."}</p>
        </div>
      ) : null}

      <div className="synthesis-columns">
        <article>
          <span>01</span>
          <div>
            <h3>{ja ? "報告された原因候補" : "Reported possible causes"}</h3>
            <ul>{synthesis.reportedCauseCandidates.map((item) => <li key={item.text}><strong>{item.text}</strong><small>{ja ? `独立報告 ${item.independentReportCount}件` : `${item.independentReportCount} independent report(s)`}</small></li>)}</ul>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h3>{ja ? "報告された確認箇所" : "Reported checks"}</h3>
            <ul>{synthesis.reportedChecks.map((item) => <li key={item.text}>{item.text}</li>)}</ul>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h3>{ja ? "結果の内訳" : "Outcome range"}</h3>
            <dl>
              <div><dt>{ja ? "改善" : "Improved"}</dt><dd>{synthesis.outcomes.improved}</dd></div>
              <div><dt>{ja ? "未解決" : "Unresolved"}</dt><dd>{synthesis.outcomes.unresolved}</dd></div>
              <div><dt>{ja ? "変化なし・悪化" : "No change / worsened"}</dt><dd>{synthesis.outcomes.no_change + synthesis.outcomes.worsened}</dd></div>
            </dl>
          </div>
        </article>
      </div>

      <footer className="synthesis-footer">
        <BookOpenCheck size={18} />
        <span>{ja ? `原因の断定ではありません。最大独立報告数: ${independentReports}` : `This is not a diagnosis. Maximum independent report count: ${independentReports}`}</span>
      </footer>
    </section>
  );
}
