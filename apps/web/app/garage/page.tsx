"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalMedia } from "@/components/journal-media";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useApp } from "@/lib/app-context";
import { garageServiceAttributionLabel } from "@/lib/garage-pilot";
import {
  formatOwnershipDuration,
  formatOwnershipPeriod,
  displayVehicleModel,
  getOwnJournals,
  groupVehiclesByOwnership,
  journalOccurrenceDate,
  journalOccurrenceLabel,
  maintenanceRecordDateKey,
  maintenanceRecordDateLabel,
  resolveJournalDisplayContent,
  summarizeVehicleRelationship,
  type JournalEventType,
  type JournalMediaAttachment,
  type MaintenanceServiceAttributionV1,
  type Vehicle,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowLeftRight, Bike, Camera, CarFront, CheckCircle2, History, Pencil, Plus, RotateCcw, Share2, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function GaragePage() {
  return <Suspense fallback={null}><GarageContent /></Suspense>;
}

function GarageContent() {
  const {
    data,
    locale,
    signedIn,
    isRemoteAlpha,
    workspaceLoadState,
    retryWorkspace,
    resetDemo,
    recordEngagement,
  } = useApp();
  const params = useSearchParams();
  const ownVehicles = data.vehicles.filter(
    (item) => item.ownerProfileId === data.currentProfileId,
  );
  const groupedVehicles = groupVehiclesByOwnership(ownVehicles);
  const previousVehicles = [...groupedVehicles.previous].sort((left, right) =>
    (right.ownershipEndedYear ?? right.ownershipStartedYear ?? 0) -
    (left.ownershipEndedYear ?? left.ownershipStartedYear ?? 0));
  const requestedVehicle = ownVehicles.find((item) => item.id === params.get("vehicle"));
  const initialVehicle = requestedVehicle ?? groupedVehicles.current[0] ?? previousVehicles[0] ?? groupedVehicles.other[0];
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicle?.id ?? "");
  const [momentAdded, setMomentAdded] = useState(false);
  const vehicle = ownVehicles.find((item) => item.id === selectedVehicleId) ?? initialVehicle;
  const owner = data.profiles.find((profile) => profile.id === vehicle?.ownerProfileId);
  const records = data.records.filter((record) => record.vehicleId === vehicle?.id);
  const journals = getOwnJournals(data).filter((journal) => journal.vehicleId === vehicle?.id);
  const ja = locale === "ja";
  useEffect(() => {
    if (signedIn) recordEngagement("garage_viewed");
  }, [recordEngagement, signedIn]);
  useEffect(() => {
    const selected = params.get("vehicle");
    if (params.get("moment") !== "added") {
      if (selected) window.history.replaceState({}, "", "/garage");
      return;
    }
    const timer = window.setTimeout(() => {
      setMomentAdded(true);
    }, 0);
    window.history.replaceState({}, "", "/garage");
    return () => window.clearTimeout(timer);
  }, [params]);
  if (!signedIn) {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">MY GARAGE</span>
            <h1>{ja ? "ガレージを見るにはログインが必要です" : "Log in to view your Garage"}</h1>
            <p>{ja ? "ログインすると、愛車やこれまでの記録を確認できます。" : "Log in to view your vehicles and records."}</p>
          </div>
        </header>
        <Link href={`/auth?returnTo=${encodeURIComponent("/garage")}`} className="primary-action">{ja ? "ログイン" : "Log in"}</Link>
      </div>
    );
  }
  if (workspaceLoadState === "loading") {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header"><div><span className="eyebrow">MY GARAGE</span><h1>{ja ? "ガレージを準備しています" : "Preparing your Garage"}</h1><p>{ja ? "愛車と記録を読み込んでいます。" : "Loading your vehicles and records."}</p></div></header>
        <div className="empty-state" role="status"><CarFront size={28} aria-hidden="true" /><p>{ja ? "読み込み中…" : "Loading…"}</p></div>
      </div>
    );
  }
  if (workspaceLoadState === "error") {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header"><div><span className="eyebrow">MY GARAGE</span><h1>{ja ? "ガレージを読み込めませんでした" : "Your Garage could not be loaded"}</h1><p>{ja ? "通信を確認して、もう一度お試しください。" : "Check your connection and try again."}</p></div></header>
        <div className="empty-state"><button type="button" className="primary-action" onClick={() => void retryWorkspace()}>{ja ? "もう一度試す" : "Try again"}</button></div>
      </div>
    );
  }
  if (!vehicle) {
    return (
      <div className="page-stack garage-v2">
        <DemoNotice />
        <section className="garage-v2-first-vehicle">
          <div className="garage-v2-first-vehicle-mark"><CarFront size={34} aria-hidden="true" /><span>{ja ? "最初のページをつくる" : "Begin a vehicle story"}</span></div>
          <div><h1>{ja ? "最初の愛車を迎え入れよう" : "Welcome your first vehicle"}</h1><p>{ja ? "メーカーと車種だけでも大丈夫です。整備も、ドライブも、何気ない一枚も、ここからこのクルマの時間になります。" : "Make and model are enough. Maintenance, drives, and ordinary photos can all become this vehicle's history."}</p><Link href="/garage/new" className="primary-action"><Plus size={18} />{ja ? "愛車を登録" : "Add vehicle"}</Link><Link href="/garage/new?ownership=previously_owned" className="text-link">{ja ? "以前の愛車を残す" : "Remember a previous vehicle"}</Link></div>
        </section>
      </div>
    );
  }
  const relationship = summarizeVehicleRelationship(vehicle);
  const ownershipDuration = formatOwnershipDuration(locale, relationship);
  const vehicleModel = displayVehicleModel(vehicle, locale);
  const vehicleLabel = `${vehicle.make} ${vehicleModel}`;
  const isPreviousVehicle = vehicle.ownershipType === "previously_owned";
  const ownershipPeriod = formatOwnershipPeriod(vehicle, locale);
  const timeline: GarageTimelineItem[] = [
    ...journals.map((journal) => {
      const display = resolveJournalDisplayContent(data, journal, locale);
      return ({
      id: journal.id,
      kind: "journal" as const,
      date: journalOccurrenceDate(journal),
      dateLabel: journalOccurrenceLabel(journal, locale),
      title: display.title,
      body: display.body,
      eventType: journal.eventType,
      href: `/journal/${journal.id}`,
      media: journal.media[0],
      serviceAttribution: journal.serviceAttribution,
      });
    }),
    ...records.map((record) => ({
      id: record.id,
      kind: "record" as const,
      date: maintenanceRecordDateKey(record),
      dateLabel: maintenanceRecordDateLabel(record, locale),
      title: record.summary,
      body: record.result || record.workPerformed,
      href: `/records/${record.id}`,
      serviceAttribution: record.serviceAttribution,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  return (
    <div className="page-stack garage-v2">
      <DemoNotice />
      {momentAdded && (
        <div className="lovable-success" role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div><strong>{ja ? "このクルマとの記録が、ひとつ増えました。" : "One more moment has joined this vehicle's story."}</strong><span>{ja ? "Garageの時間軸に保存しました。" : "It is now part of the Garage timeline."}</span></div>
          <button type="button" onClick={() => setMomentAdded(false)}>{ja ? "閉じる" : "Dismiss"}</button>
        </div>
      )}
      <section className={`garage-v2-hero${vehicle.imagePath ? "" : " is-no-photo"}`} aria-label={ja ? "愛車の概要" : "Vehicle overview"}>
        <div className="garage-v2-photo-stage">
          {vehicle.imagePath ? (
            <Image src={vehicle.imagePath} alt={vehicle.isDemo ? (ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster") : vehicleLabel} fill sizes="(max-width: 760px) 100vw, 68vw" unoptimized={vehicle.imagePath.startsWith("data:")} priority />
          ) : (
            <VehicleFallback vehicle={vehicle} locale={locale} ownershipPeriod={ownershipPeriod} />
          )}
        </div>
        <div className="garage-v2-identity-sheet">
          <div className="garage-v2-status-line">
            <span>{isPreviousVehicle ? (ja ? "これまでの愛車" : "Previously owned") : (ja ? "いまの愛車" : "Current vehicle")}</span>
            {vehicle.isDemo && <span className="demo-label">DEMO</span>}
          </div>
          <h1>{vehicle.nickname || vehicleLabel}</h1>
          {vehicle.nickname && <p className="garage-v2-model-line">{vehicle.year ? `${vehicle.year} ` : ""}{vehicleLabel}</p>}
          <div className="garage-v2-owner-line">
            <ProfileAvatar displayName={owner?.displayName ?? "MECHORI"} imagePath={owner?.profileImagePath} />
            <span>{ja ? `${owner?.displayName ?? "オーナー"}の愛車` : `${owner?.displayName ?? "Owner"}'s vehicle`}</span>
          </div>
          <p className="garage-v2-life-line" aria-label={ja ? "車両と所有の情報" : "Vehicle and ownership information"}>
            {relationship.vehicleAgeYears !== undefined && <span>{ja ? `${relationship.vehicleAgeYears}年を走ってきた` : `${relationship.vehicleAgeYears} years on the road`}</span>}
            {ownershipDuration && <span>{ownershipDuration}</span>}
            {vehicle.currentOdometerReading.displayedValue > 0 && <span>{vehicle.currentOdometerReading.displayedValue.toLocaleString()} {vehicle.currentOdometerReading.unit}</span>}
          </p>
          {vehicle.ownerComment && <blockquote className="garage-v2-owner-note">{vehicle.ownerComment}</blockquote>}
          <div className="garage-v2-record-actions">
            <Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action garage-v2-record-action"><Camera size={18} />{ja ? "このクルマの記録を残す" : "Add a record for this vehicle"}</Link>
            <Link href={`/records/new?vehicle=${encodeURIComponent(vehicle.id)}`} className="garage-v2-detailed-link">{ja ? "整備を詳しく記録" : "Add detailed maintenance"}</Link>
          </div>
          <div className="garage-v2-utility-links">
            <Link href={`/garage/${encodeURIComponent(vehicle.id)}/specification`}><Pencil size={16} />{translate(locale, "editVehicleSpecification")}</Link>
            <Link href={`/garage/${encodeURIComponent(vehicle.id)}/ownership`}><ArrowLeftRight size={16} />{isPreviousVehicle ? (ja ? "現在の愛車へ戻す" : "Move to current vehicles") : (ja ? "所有を終了" : "End ownership")}</Link>
            <Link href={`/garage/${encodeURIComponent(vehicle.id)}/share`}><Share2 size={16} />{ja ? "見せる・共有" : "Show & share"}</Link>
          </div>
        </div>
      </section>

      <section className="garage-v2-vehicle-selector" aria-label={ja ? "愛車を選ぶ" : "Choose a vehicle"}>
        <div className="garage-v2-selector-heading"><h2>{ja ? "このGarageの愛車" : "Vehicles in this garage"}</h2><Link href="/garage/new" className="text-link"><Plus size={16} />{ja ? "愛車を追加" : "Add vehicle"}</Link></div>
        <div className="garage-v2-vehicle-rail">
          {groupedVehicles.current.map((item) => <VehicleSwitchButton key={item.id} item={item} selected={item.id === vehicle.id} locale={locale} onSelect={() => setSelectedVehicleId(item.id)} />)}
          {previousVehicles.map((item) => <VehicleSwitchButton key={item.id} item={item} selected={item.id === vehicle.id} locale={locale} onSelect={() => setSelectedVehicleId(item.id)} />)}
          {groupedVehicles.other.map((item) => <VehicleSwitchButton key={item.id} item={item} selected={item.id === vehicle.id} locale={locale} onSelect={() => setSelectedVehicleId(item.id)} />)}
          <Link href="/garage/new?ownership=previously_owned" className="garage-v2-add-previous"><History size={17} />{ja ? "以前の愛車を追加" : "Add a previous vehicle"}</Link>
        </div>
        {!isRemoteAlpha && <button className="garage-v2-reset" type="button" onClick={() => { void resetDemo().catch(() => undefined); }}><RotateCcw size={15} />{translate(locale, "resetDemo")}</button>}
      </section>

      <section className="garage-v2-history">
        <div className="garage-v2-history-heading">
          <h2>{ja ? "このクルマの時間" : "This vehicle's history"}</h2>
          <p>{timeline.length ? (ja ? `整備も思い出も、${timeline.length}件の出来事として残っています。` : `${timeline.length} moments, from maintenance to memories.`) : (ja ? "最初の出来事から、このクルマの時間が始まります。" : "This vehicle's story can start with one moment.")}</p>
        </div>
        {timeline.length ? (
          <div className="garage-v2-timeline">
            {timeline.slice(0, 12).map((item, index) => <GarageTimelineItem item={item} locale={locale} featured={index === 0} key={`${item.kind}-${item.id}`} />)}
            {timeline.length > 12 && <p className="garage-v2-timeline-note">{ja ? `最近の12件を表示しています。` : "Showing the most recent 12 moments."}</p>}
          </div>
        ) : (
          <div className="garage-v2-empty-history">
            <div><p>{ja ? "まだ何も書かれていない時間があります。" : "There is still an unwritten stretch of time."}</p><h3>{isPreviousVehicle ? (ja ? "覚えている出来事から残せます" : "Add what you remember") : (ja ? "このクルマとの最初の記録を残す" : "Add the first moment with this vehicle")}</h3><span>{isPreviousVehicle ? (ja ? "修理、ドライブ、手放した日のこと。分かる範囲から残せます。" : "A repair, drive, or final day can be remembered here.") : (ja ? "整備だけでなく、今日の一枚や短いドライブのことも、このクルマの履歴になります。" : "Maintenance, a photo, or a short drive all become part of this vehicle's history.")}</span><Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action">{ja ? "このクルマの記録を残す" : "Add a record"}</Link></div>
          </div>
        )}
      </section>
    </div>
  );
}

type GarageTimelineItem = {
  id: string;
  kind: "journal" | "record";
  date: string;
  dateLabel: string;
  title: string;
  body?: string;
  eventType?: JournalEventType;
  href: string;
  media?: JournalMediaAttachment;
  serviceAttribution?: MaintenanceServiceAttributionV1;
};

function VehicleFallback({
  vehicle,
  locale,
  ownershipPeriod,
}: {
  vehicle: Vehicle;
  locale: "ja" | "en";
  ownershipPeriod: string;
}) {
  return (
    <div className="garage-v2-vehicle-fallback">
      <p>{vehicle.year ?? (locale === "ja" ? "年式未登録" : "Year not set")}</p>
      <strong>{vehicle.make}</strong>
      <span>{vehicle.nickname || displayVehicleModel(vehicle, locale)}</span>
      <span>{ownershipPeriod}</span>
    </div>
  );
}

function GarageTimelineItem({
  item,
  locale,
  featured,
}: {
  item: GarageTimelineItem;
  locale: "ja" | "en";
  featured: boolean;
}) {
  const ja = locale === "ja";
  const isMaintenance = item.kind === "record";
  const label = isMaintenance ? (ja ? "整備" : "Maintenance") : eventTypeLabel(item.eventType, ja);
  const attribution = garageServiceAttributionLabel(item.serviceAttribution, locale);
  const title = item.title || item.body || (ja ? "記録" : "Record");
  const body = item.body && item.body !== title ? item.body : undefined;

  return (
    <Link href={item.href} className={`garage-v2-timeline-item is-${item.kind}${featured ? " is-featured" : ""}`}>
      <time className="garage-v2-timeline-date" dateTime={item.date}>{item.dateLabel}</time>
      <span className={`garage-v2-timeline-mark is-${item.kind}`} aria-hidden="true">
        {isMaintenance ? <Wrench size={16} /> : <Camera size={16} />}
      </span>
      <div className="garage-v2-timeline-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        {body && <p>{body}</p>}
        {attribution && <span className="garage-v2-attribution">{attribution}</span>}
      </div>
      {item.kind === "journal" && item.media?.kind === "image" && (
        <div className="garage-v2-timeline-media">
          <JournalMedia attachments={[item.media]} locale={locale} compact />
        </div>
      )}
    </Link>
  );
}

function VehicleSwitchButton({
  item,
  selected,
  locale,
  onSelect,
}: {
  item: Vehicle;
  selected: boolean;
  locale: "ja" | "en";
  onSelect(): void;
}) {
  const ja = locale === "ja";
  const VehicleIcon = item.vehicleCategory === "motorcycle" || item.vehicleCategory === "moped"
    ? Bike
    : CarFront;
  return (
    <button type="button" className={`garage-v2-vehicle-switch${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={onSelect}>
      <VehicleIcon size={17} aria-hidden="true" />
      <span><strong>{item.make} {displayVehicleModel(item, locale)}</strong><small>{item.year ?? (ja ? "年式未登録" : "Year not set")}</small></span>
    </button>
  );
}

function eventTypeLabel(value: JournalEventType | undefined, ja: boolean): string {
  const labels: Record<JournalEventType, [string, string]> = {
    delivery: ["納車・購入", "Delivery / purchase"], photo: ["今日の一枚", "Photo of the day"], drive: ["ドライブ", "Drive"], inspection: ["車検・点検", "Inspection"], tire: ["タイヤ交換", "Tires"], oil: ["オイル交換", "Oil change"], breakdown: ["故障", "Breakdown"], repair: ["修理", "Repair"], part: ["部品交換", "Parts"], custom: ["カスタム", "Custom"], event: ["イベント参加", "Event"], memory: ["思い出", "Memory"], other: ["出来事", "Moment"],
  };
  const label = labels[value ?? "other"];
  return ja ? label[0] : label[1];
}
