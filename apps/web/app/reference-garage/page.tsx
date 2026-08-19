import { EvidenceFlowStrip } from "@/components/evidence-flow-strip";
import { demoData, displayVehicleModel } from "@mechori/core";
import { ArrowLeft, CarFront } from "lucide-react";
import Link from "next/link";

export default function ReferenceGaragePage() {
  const vehicle = demoData.vehicles[0]!;
  const record = demoData.records.find((item) => item.id === "record-demo-oil")!;
  const part = record.parts[0]?.name;

  return (
    <div className="page-stack reference-garage">
      <Link href="/" className="back-link"><ArrowLeft size={17} />ホームへ戻る</Link>
      <header className="reference-garage-heading">
        <p className="section-label">MECHORI Reference Garage · DEMO車両</p>
        <h1>記録がつながった例</h1>
        <p>実ユーザーのデータではありません。既存のDEMO記録だけで、車両の履歴がどう育つかを示しています。</p>
      </header>
      <section className="reference-garage-vehicle" aria-label="デモ車両">
        <CarFront size={24} aria-hidden="true" />
        <div><small>Vehicle</small><strong>{vehicle.make} {displayVehicleModel(vehicle, "ja")}</strong><span>{vehicle.year}年 · {vehicle.engine}</span></div>
      </section>
      <section className="reference-garage-flow" aria-labelledby="reference-flow-heading">
        <div><p className="section-label">この記録の流れ</p><h2 id="reference-flow-heading">記録から、後日の状態まで</h2></div>
        <EvidenceFlowStrip
          label="DEMO記録の流れ"
          steps={[
            { label: "出来事", detail: record.summary.replace("DEMO: ", "") },
            { label: "作業", detail: record.workPerformed },
            ...(part ? [{ label: "部品", detail: part }] : []),
            { label: "結果", detail: record.result },
          ]}
        />
      </section>
      <p className="reference-garage-note">この画面は整備の正しさや車両状態を保証するものではありません。記録した事実、作業、部品、結果を後からたどれる形の例です。</p>
    </div>
  );
}
