"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import {
  formatOwnershipDuration,
  getOwnJournals,
  summarizeVehicleRelationship,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { BookOpenText, CarFront, FileClock, Gauge, History, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function GaragePage() {
  const { data, locale, resetDemo, recordEngagement } = useApp();
  const ownVehicles = data.vehicles.filter(
    (item) => item.ownerProfileId === data.currentProfileId,
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState(ownVehicles[0]?.id ?? "");
  const vehicle = ownVehicles.find((item) => item.id === selectedVehicleId) ?? ownVehicles[0];
  const owner = data.profiles.find((profile) => profile.id === vehicle?.ownerProfileId);
  const records = data.records.filter((record) => record.vehicleId === vehicle?.id);
  const journals = getOwnJournals(data).filter((journal) => journal.vehicleId === vehicle?.id);
  const ja = locale === "ja";
  useEffect(() => recordEngagement("garage_viewed"), [recordEngagement]);
  if (!vehicle) return null;
  const relationship = summarizeVehicleRelationship(vehicle);
  const ownershipDuration = formatOwnershipDuration(locale, relationship);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div><span className="eyebrow">MY GARAGE</span><h1>{owner?.displayName ?? (ja ? "オーナー" : "Owner")} / {vehicleLabel}</h1><p>{ja ? "オーナーと一台の関係、仕様、整備履歴をひとつの場所で。" : "One owner-and-vehicle story, specifications, and maintenance history in one place."}</p></div>
        <div className="page-header-actions">
          <Link href="/garage/new" className="secondary-action"><Plus size={17} />{ja ? "愛車を追加" : "Add vehicle"}</Link>
          <Link href={`/garage/history?vehicle=${encodeURIComponent(vehicle.id)}`} className="primary-action"><FileClock size={17} />{translate(locale, "historySummary")}</Link>
          <button className="secondary-action" type="button" onClick={() => { void resetDemo().catch(() => undefined); }}><RotateCcw size={17} />{translate(locale, "resetDemo")}</button>
        </div>
      </header>

      {ownVehicles.length > 1 && (
        <section className="garage-vehicle-switcher" aria-label={ja ? "登録車両" : "Registered vehicles"}>
          {ownVehicles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === vehicle.id ? "is-selected" : ""}
              aria-pressed={item.id === vehicle.id}
              onClick={() => setSelectedVehicleId(item.id)}
            >
              <CarFront size={17} aria-hidden="true" />
              <span><strong>{item.make} {item.model}</strong><small>{item.year ?? (ja ? "年式未登録" : "Year not set")}</small></span>
            </button>
          ))}
        </section>
      )}

      <section className="garage-feature">
        <div className="garage-photo">
          {vehicle.imagePath ? (
            <Image src={vehicle.imagePath} alt={vehicle.isDemo ? (ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster") : `${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 900px) 100vw, 55vw" priority />
          ) : (
            <div className="garage-photo-placeholder"><CarFront size={48} aria-hidden="true" /><span>{vehicle.make} {vehicle.model}</span></div>
          )}
        </div>
        <div className="vehicle-specs">
          <div className="vehicle-identity-labels">
            {vehicle.isDemo && <span className="demo-label">DEMO VEHICLE</span>}
            {relationship.ownershipMilestoneYears && (
              <span className="relationship-badge">
                {ja
                  ? `${relationship.ownershipMilestoneYears}年オーナー`
                  : `${relationship.ownershipMilestoneYears}-year owner`}
              </span>
            )}
          </div>
          <dl>
            <div><dt>{ja ? "年式" : "Year"}</dt><dd>{vehicle.year ?? (ja ? "未登録" : "Not set")}</dd></div>
            <div><dt>{translate(locale, "vehicleAge")}</dt><dd>{relationship.vehicleAgeYears === undefined ? (ja ? "未算出" : "Not calculated") : `${relationship.vehicleAgeYears}${ja ? "年" : " years"}`}</dd></div>
            <div><dt>{translate(locale, "ownershipHistory")}</dt><dd>{ownershipDuration ?? (ja ? "未登録" : "Not set")}</dd></div>
            <div><dt>{ja ? "エンジン" : "Engine"}</dt><dd>{vehicle.engine || (ja ? "未登録" : "Not set")}</dd></div>
            <div><dt>{ja ? "ハンドル" : "Steering"}</dt><dd>{vehicle.steering || (ja ? "未登録" : "Not set")}</dd></div>
            <div><dt>{ja ? "トランスミッション" : "Transmission"}</dt><dd>{vehicle.transmission || (ja ? "未登録" : "Not set")}</dd></div>
          </dl>
          <div className="odometer"><Gauge size={22} /><span><small>{ja ? "現在の走行距離" : "Current odometer"}</small><strong>{vehicle.currentOdometerReading.displayedValue.toLocaleString()} {vehicle.currentOdometerReading.unit}</strong></span></div>
          <p className="privacy-caption">{ja ? "車齢は年式からの概算です。所有歴は人気や整備情報の信頼度を決めません。VIN・ナンバープレート・正確な保管場所は保持しません。" : "Vehicle age is estimated from model year. Ownership length never changes knowledge trust. VIN, registration plate, and precise storage location are not retained."}</p>
        </div>
      </section>

      <section className="garage-stats">
        <div><History size={21} /><strong>{records.length}</strong><span>{ja ? "整備記録" : "Records"}</span></div>
        <div><TriangleAlert size={21} /><strong>{records.filter((record) => record.resolutionStatus === "unresolved").length}</strong><span>{ja ? "未解決" : "Unresolved"}</span></div>
        <div><Gauge size={21} /><strong>{records.filter((record) => record.visibility === "pending_review").length}</strong><span>{ja ? "運営確認待ち" : "Pending review"}</span></div>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">HISTORY</span><h2>{translate(locale, "recentRecords")}</h2></div><Link href={`/records/new?vehicle=${encodeURIComponent(vehicle.id)}`} className="secondary-action"><Plus size={17} />{translate(locale, "addRecord")}</Link></div>
        <div className="record-grid">{records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
      </section>

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">GARAGE JOURNAL</span><h2>{ja ? "このクルマのJournal" : "Journal for this car"}</h2></div>
          <Link href="/journal/new" className="secondary-action"><Plus size={17} />{translate(locale, "addJournal")}</Link>
        </div>
        {journals.length ? (
          <div className="journal-grid">
            {journals.map((journal) => <JournalCard key={journal.id} journal={journal} author={data.profiles.find((profile) => profile.id === journal.authorProfileId)} record={data.records.find((record) => record.id === journal.linkedRecordId)} locale={locale} />)}
          </div>
        ) : (
          <div className="empty-state"><BookOpenText size={28} /><h3>{ja ? "まだJournalはありません" : "No journal yet"}</h3><p>{ja ? "整備の経緯や、その日に感じたことを自分の言葉で残せます。" : "Keep the experience and what you felt in your own words."}</p></div>
        )}
      </section>
    </div>
  );
}
