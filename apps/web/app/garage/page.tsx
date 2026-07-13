"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { translate } from "@mechory/i18n";
import { Gauge, History, RotateCcw, TriangleAlert } from "lucide-react";
import Image from "next/image";

export default function GaragePage() {
  const { data, locale, resetDemo } = useApp();
  const vehicle = data.vehicles[0];
  const records = data.records.filter((record) => record.vehicleId === vehicle?.id);
  const ja = locale === "ja";
  if (!vehicle) return null;

  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div><span className="eyebrow">MY GARAGE</span><h1>{vehicle.make} {vehicle.model}</h1><p>{ja ? "愛車の仕様と整備履歴を、ひとつの場所で。" : "Vehicle identity and maintenance history in one place."}</p></div>
        <button className="secondary-action" type="button" onClick={() => void resetDemo()}><RotateCcw size={17} />{translate(locale, "resetDemo")}</button>
      </header>

      <section className="garage-feature">
        <div className="garage-photo"><Image src={vehicle.imagePath} alt={ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster"} fill sizes="(max-width: 900px) 100vw, 55vw" priority /></div>
        <div className="vehicle-specs">
          <span className="demo-label">DEMO VEHICLE</span>
          <dl>
            <div><dt>{ja ? "年式" : "Year"}</dt><dd>{vehicle.year}</dd></div>
            <div><dt>{ja ? "エンジン" : "Engine"}</dt><dd>{vehicle.engine}</dd></div>
            <div><dt>{ja ? "ハンドル" : "Steering"}</dt><dd>{vehicle.steering}</dd></div>
            <div><dt>{ja ? "トランスミッション" : "Transmission"}</dt><dd>{vehicle.transmission}</dd></div>
          </dl>
          <div className="odometer"><Gauge size={22} /><span><small>{ja ? "現在の走行距離" : "Current odometer"}</small><strong>{vehicle.odometerKm.toLocaleString()} km</strong></span></div>
          <p className="privacy-caption">{ja ? "VIN・ナンバープレート・正確な保管場所は保持しません。" : "VIN, registration plate, and precise storage location are not retained."}</p>
        </div>
      </section>

      <section className="garage-stats">
        <div><History size={21} /><strong>{records.length}</strong><span>{ja ? "整備記録" : "Records"}</span></div>
        <div><TriangleAlert size={21} /><strong>{records.filter((record) => record.resolutionStatus === "unresolved").length}</strong><span>{ja ? "未解決" : "Unresolved"}</span></div>
        <div><Gauge size={21} /><strong>{records.filter((record) => record.visibility === "pending_review").length}</strong><span>{ja ? "運営確認待ち" : "Pending review"}</span></div>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">HISTORY</span><h2>{translate(locale, "recentRecords")}</h2></div></div>
        <div className="record-grid">{records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
      </section>
    </div>
  );
}
