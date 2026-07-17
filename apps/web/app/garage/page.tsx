"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import {
  formatOwnershipDuration,
  getOwnJournals,
  summarizeVehicleRelationship,
  type JournalEventType,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { BookOpenText, CalendarDays, Camera, CarFront, CheckCircle2, Gauge, Plus, RotateCcw, Share2, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function GaragePage() {
  const { data, locale, isRemoteAlpha, resetDemo, recordEngagement } = useApp();
  const ownVehicles = data.vehicles.filter(
    (item) => item.ownerProfileId === data.currentProfileId,
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState(ownVehicles[0]?.id ?? "");
  const [momentAdded, setMomentAdded] = useState(false);
  const vehicle = ownVehicles.find((item) => item.id === selectedVehicleId) ?? ownVehicles[0];
  const owner = data.profiles.find((profile) => profile.id === vehicle?.ownerProfileId);
  const records = data.records.filter((record) => record.vehicleId === vehicle?.id);
  const journals = getOwnJournals(data).filter((journal) => journal.vehicleId === vehicle?.id);
  const ja = locale === "ja";
  useEffect(() => recordEngagement("garage_viewed"), [recordEngagement]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("moment") !== "added") return;
    const timer = window.setTimeout(() => {
      setMomentAdded(true);
      const selected = query.get("vehicle");
      if (selected) setSelectedVehicleId(selected);
    }, 0);
    window.history.replaceState({}, "", "/garage");
    return () => window.clearTimeout(timer);
  }, []);
  if (!vehicle) {
    return (
      <div className="page-stack">
        <DemoNotice />
        <header className="page-header">
          <div>
            <span className="eyebrow">MY GARAGE</span>
            <h1>{ja ? "最初の愛車を登録しましょう" : "Add your first vehicle"}</h1>
            <p>{ja ? "メーカーと車種が一覧になくても、その場で自由に登録できます。" : "You can enter any make and model, even when it is not listed."}</p>
          </div>
        </header>
        <div className="empty-state">
          <CarFront size={38} aria-hidden="true" />
          <h2>{ja ? "Garageはまだ空です" : "Your Garage is empty"}</h2>
          <p>{ja ? "年式や型式が分からなくても、メーカーと車種だけで始められます。" : "Make and model are enough to begin; year and specifications can be added later."}</p>
          <Link href="/garage/new" className="primary-action"><Plus size={18} />{ja ? "愛車を登録" : "Add vehicle"}</Link>
        </div>
      </div>
    );
  }
  const relationship = summarizeVehicleRelationship(vehicle);
  const ownershipDuration = formatOwnershipDuration(locale, relationship);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const timeline = [
    ...journals.map((journal) => ({
      id: journal.id,
      kind: "journal" as const,
      date: journal.createdAt,
      title: journal.title,
      body: journal.bodyOriginal,
      eventType: journal.eventType,
      href: `/journal/${journal.id}`,
      media: journal.media[0],
    })),
    ...records.map((record) => ({
      id: record.id,
      kind: "record" as const,
      date: record.serviceDate,
      title: record.summary,
      body: record.result || record.workPerformed,
      href: `/records/${record.id}`,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  return (
    <div className="page-stack">
      <DemoNotice />
      {momentAdded && (
        <div className="lovable-success" role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div><strong>{ja ? "このクルマとの記録が、ひとつ増えました。" : "One more moment has joined this vehicle's story."}</strong><span>{ja ? "Garageの時間軸に保存しました。" : "It is now part of the Garage timeline."}</span></div>
          <button type="button" onClick={() => setMomentAdded(false)}>{ja ? "閉じる" : "Dismiss"}</button>
        </div>
      )}
      <header className="page-header">
        <div><span className="eyebrow">MY GARAGE</span><h1>{vehicle.year ? `${vehicle.year}${ja ? "年式の" : " "}` : ""}{vehicleLabel}</h1><p>{ja ? `${owner?.displayName ?? "オーナー"}と、この一台の時間。` : `The time shared by ${owner?.displayName ?? "its owner"} and this vehicle.`}</p></div>
        <div className="page-header-actions">
          <Link href="/garage/new" className="secondary-action"><Plus size={17} />{ja ? "愛車を追加" : "Add vehicle"}</Link>
          <Link href={`/garage/${encodeURIComponent(vehicle.id)}/share`} className="secondary-action"><Share2 size={17} />{ja ? "見せる・共有" : "Show & share"}</Link>
          <Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action"><Camera size={17} />{ja ? "出来事を追加" : "Add a moment"}</Link>
          {!isRemoteAlpha && <button className="secondary-action" type="button" onClick={() => { void resetDemo().catch(() => undefined); }}><RotateCcw size={17} />{translate(locale, "resetDemo")}</button>}
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
            <Image src={vehicle.imagePath} alt={vehicle.isDemo ? (ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster") : `${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 900px) 100vw, 55vw" unoptimized={vehicle.imagePath.startsWith("data:")} priority />
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
          {vehicle.ownerComment && <blockquote className="vehicle-owner-comment">{vehicle.ownerComment}</blockquote>}
          <dl>
            <div><dt>{ja ? "年式" : "Year"}</dt><dd>{vehicle.year ?? (ja ? "未登録" : "Not set")}</dd></div>
            <div><dt>{translate(locale, "vehicleAge")}</dt><dd>{relationship.vehicleAgeYears === undefined ? (ja ? "未算出" : "Not calculated") : `${relationship.vehicleAgeYears}${ja ? "年" : " years"}`}</dd></div>
            <div><dt>{translate(locale, "ownershipHistory")}</dt><dd>{ownershipDuration ?? (ja ? "未登録" : "Not set")}</dd></div>
            {vehicle.engine && <div><dt>{ja ? "エンジン" : "Engine"}</dt><dd>{vehicle.engine}</dd></div>}
            {vehicle.steering && <div><dt>{ja ? "ハンドル" : "Steering"}</dt><dd>{vehicle.steering}</dd></div>}
            {vehicle.transmission && <div><dt>{ja ? "トランスミッション" : "Transmission"}</dt><dd>{vehicle.transmission}</dd></div>}
          </dl>
          {vehicle.currentOdometerReading.displayedValue > 0 && <div className="odometer"><Gauge size={22} /><span><small>{ja ? "現在の走行距離" : "Current odometer"}</small><strong>{vehicle.currentOdometerReading.displayedValue.toLocaleString()} {vehicle.currentOdometerReading.unit}</strong></span></div>}
          <p className="privacy-caption">{ja ? "車齢と所有年月は登録された年・月からの概算です。" : "Vehicle age and ownership duration are approximate, based on the year and month provided."}</p>
        </div>
      </section>

      <section className="garage-stats">
        <div><CalendarDays size={21} /><strong>{timeline.length}</strong><span>{ja ? "出来事の合計" : "Moments"}</span></div>
        <div><Camera size={21} /><strong>{journals.length}</strong><span>{ja ? "写真・日常" : "Stories"}</span></div>
        <div><Wrench size={21} /><strong>{records.length}</strong><span>{ja ? "整備記録" : "Maintenance"}</span></div>
      </section>

      <section className="vehicle-timeline-section">
        <div className="section-heading"><div><span className="eyebrow">VEHICLE TIMELINE</span><h2>{ja ? "このクルマの時間" : "This vehicle's timeline"}</h2></div><Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="secondary-action"><Plus size={17} />{ja ? "ひとつ追加" : "Add one"}</Link></div>
        {timeline.length ? (
          <div className="vehicle-timeline">
            {timeline.slice(0, 8).map((item) => {
              const title = item.kind === "journal" && item.body ? item.body : item.title;
              const description = item.kind === "record" ? item.body : undefined;
              return (
                <Link href={item.href} className="vehicle-timeline-item" key={`${item.kind}-${item.id}`}>
                  <span className={`timeline-mark is-${item.kind}`}>{item.kind === "record" ? <Wrench size={16} /> : <Camera size={16} />}</span>
                  <time>{formatTimelineDate(item.date, locale)}</time>
                  <div><small>{item.kind === "record" ? (ja ? "整備" : "Maintenance") : eventTypeLabel(item.eventType, ja)}</small><strong>{title}</strong>{description && <p>{description}</p>}</div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state timeline-empty"><Camera size={30} /><h3>{ja ? "最初の一枚から始めましょう" : "Start with the first photo"}</h3><p>{ja ? "整備がなくても、今日の一枚やドライブの一言を残せます。" : "No maintenance required. A photo or one line from a drive is enough."}</p><Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action">{ja ? "最初の出来事を追加" : "Add the first moment"}</Link></div>
        )}
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">HISTORY</span><h2>{translate(locale, "recentRecords")}</h2></div><Link href={`/records/new?vehicle=${encodeURIComponent(vehicle.id)}`} className="secondary-action"><Plus size={17} />{translate(locale, "addRecord")}</Link></div>
        {records.length ? <div className="record-grid">{records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div> : <div className="empty-state compact-empty"><Wrench size={28} /><p>{ja ? "整備があったときに、詳しい内容をここへ残せます。" : "Detailed maintenance can be added here when it happens."}</p></div>}
      </section>

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">GARAGE JOURNAL</span><h2>{ja ? "このクルマのJournal" : "Journal for this car"}</h2></div>
          <Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="secondary-action"><Plus size={17} />{ja ? "写真と一言を追加" : "Add photo & note"}</Link>
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

function formatTimelineDate(value: string, locale: "ja" | "en"): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function eventTypeLabel(value: JournalEventType | undefined, ja: boolean): string {
  const labels: Record<JournalEventType, [string, string]> = {
    delivery: ["納車・購入", "Delivery / purchase"], photo: ["今日の一枚", "Photo of the day"], drive: ["ドライブ", "Drive"], inspection: ["車検・点検", "Inspection"], tire: ["タイヤ交換", "Tires"], oil: ["オイル交換", "Oil change"], breakdown: ["故障", "Breakdown"], repair: ["修理", "Repair"], part: ["部品交換", "Parts"], custom: ["カスタム", "Custom"], event: ["イベント参加", "Event"], memory: ["思い出", "Memory"], other: ["出来事", "Moment"],
  };
  const label = labels[value ?? "other"];
  return ja ? label[0] : label[1];
}
