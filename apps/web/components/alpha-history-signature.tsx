import { VehicleHistorySpine, type VehicleHistorySpineItem } from "@/components/vehicle-history-spine";
import {
  demoData,
  displayVehicleModel,
  journalOccurrenceLabel,
  maintenanceRecordDateLabel,
  type Locale,
} from "@mechori/core";
import Link from "next/link";

function demoHistoryItems(locale: Locale): VehicleHistorySpineItem[] {
  const ja = locale === "ja";
  const workshopRecord = demoData.records.find((item) => item.id === "record-demo-oil")!;
  const issueRecord = demoData.records.find((item) => item.id === "record-demo-warning")!;
  const ownerJournal = demoData.journals.find((item) => item.id === "journal-demo-owner-private")!;
  const owner = demoData.profiles.find((item) => item.id === ownerJournal.authorProfileId)!;
  const workshop = workshopRecord.serviceAttribution.providerDisplayNameSnapshot;

  return [
    {
      id: workshopRecord.id,
      dateLabel: maintenanceRecordDateLabel(workshopRecord, locale),
      dateTime: workshopRecord.serviceDate,
      label: ja ? "整備記録" : "Maintenance record",
      title: workshopRecord.summary.replace("DEMO: ", ""),
      detail: workshopRecord.workPerformed,
      actor: workshop
        ? ja ? `作業: ${workshop}` : `Work: ${workshop}`
        : undefined,
      kind: "work",
    },
    {
      id: issueRecord.id,
      dateLabel: maintenanceRecordDateLabel(issueRecord, locale),
      dateTime: issueRecord.serviceDate,
      label: ja ? "気になること" : "Something noticed",
      title: issueRecord.summary.replace("DEMO: ", ""),
      detail: issueRecord.symptoms,
      status: issueRecord.resolutionStatus === "unresolved"
        ? ja ? "未解決" : "Unresolved"
        : undefined,
      kind: "issue",
    },
    {
      id: ownerJournal.id,
      dateLabel: journalOccurrenceLabel(ownerJournal, locale),
      dateTime: ownerJournal.occurredOn ?? ownerJournal.createdAt,
      label: ja ? "オーナー記録" : "Owner record",
      title: ownerJournal.title.replace("DEMO: ", ""),
      actor: ja ? `記録: ${owner.displayName}` : `Recorded by ${owner.displayName}`,
      kind: "record",
    },
  ];
}

export function AlphaHistorySignature({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const ja = locale === "ja";
  const vehicle = demoData.vehicles[0]!;

  return (
    <section
      className={`alpha-history-signature${compact ? " is-compact" : ""}`}
      aria-labelledby={compact ? "home-history-signature-heading" : "reference-history-signature-heading"}
    >
      <header className="alpha-history-signature-heading">
        <div>
          <span className="demo-label">DEMO</span>
          <p>{vehicle.make} {displayVehicleModel(vehicle, locale)}</p>
        </div>
        <h2 id={compact ? "home-history-signature-heading" : "reference-history-signature-heading"}>
          {ja ? "人が変わっても、クルマの時間は続く。" : "A vehicle's history continues as people change."}
        </h2>
        <small>
          {ja
            ? "実ユーザーの記録ではありません。既存のDEMOデータによる履歴例です。"
            : "This is a clearly labeled example built from demo data, not real user history."}
        </small>
      </header>
      <VehicleHistorySpine
        label={ja ? "DEMO車両の履歴" : "Demo vehicle history"}
        density={compact ? "compact" : "standard"}
        items={demoHistoryItems(locale)}
      />
      {compact ? (
        <Link href="/reference-garage" className="text-link alpha-history-signature-link">
          {ja ? "DEMO履歴を詳しく見る" : "View the demo history"}
        </Link>
      ) : (
        <p className="alpha-history-signature-future">
          {ja
            ? "現在表示できるのは一台の車両履歴です。同じ車種の別個体との比較は将来構想で、現在利用できる機能ではありません。"
            : "This currently demonstrates one vehicle history. Cross-vehicle comparison is a future direction, not an available feature."}
        </p>
      )}
    </section>
  );
}
