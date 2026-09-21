import {
  passportHistoryDateLabel,
  type PassportHistoryEntryProjection,
} from "@/lib/passport-share-projection";

const INITIAL_VISIBLE_RECORDS = 3;

export function PassportMaintenanceHistory({
  history,
}: {
  history: PassportHistoryEntryProjection[];
}) {
  const visible = history.slice(0, INITIAL_VISIBLE_RECORDS);
  const remaining = history.slice(INITIAL_VISIBLE_RECORDS);
  return (
    <section className="passport-history" aria-labelledby="passport-history-heading">
      <div className="passport-history-heading">
        <h2 id="passport-history-heading">これまでの整備履歴</h2>
        {history.length > 0 && <span>{history.length}件</span>}
      </div>
      {history.length === 0 ? (
        <p className="passport-history-empty">整備履歴はまだ登録されていません</p>
      ) : (
        <div className="passport-history-ledger">
          {visible.map((entry, index) => <PassportHistoryVisit key={`${entry.serviceDate ?? "unknown"}-${index}`} entry={entry} />)}
          {remaining.length > 0 && (
            <details className="passport-history-more">
              <summary>すべて見る（あと{remaining.length}件）</summary>
              <div className="passport-history-ledger is-continuation">
                {remaining.map((entry, index) => <PassportHistoryVisit key={`${entry.serviceDate ?? "unknown"}-more-${index}`} entry={entry} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function PassportHistoryVisit({ entry }: { entry: PassportHistoryEntryProjection }) {
  const odometer = entry.odometerValue === undefined
    ? undefined
    : `${entry.odometerValue.toLocaleString("ja-JP")} ${entry.odometerUnit === "unknown" ? "" : entry.odometerUnit ?? ""}`.trim();
  return (
    <article className="passport-history-visit">
      <header>
        <div><time>{passportHistoryDateLabel(entry)}</time>{odometer && <span>{odometer}</span>}</div>
        <h3>{entry.summary}</h3>
      </header>
      <div className="passport-history-items">
        {entry.items.map((item, index) => (
          <section key={`${item.subject}-${index}`} className="passport-history-item">
            <h4>{item.subject}</h4>
            <dl>
              {[
                ["状態", item.observedCondition],
                ["作業", item.workPerformed],
                ["部品", item.parts.join("\n")],
                ["結果", item.result],
                ["次回", item.followUpNote],
              ].filter((row): row is [string, string] => Boolean(row[1])).map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}
