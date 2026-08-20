"use client";

import { DemoNotice } from "@/components/demo-notice";
import { GarageVehicleIdentity } from "@/components/garage-vehicle-identity";
import { JournalMedia } from "@/components/journal-media";
import { VehicleContinuity, type VehicleExperienceMark } from "@/components/vehicle-continuity";
import { useApp } from "@/lib/app-context";
import { garageServiceAttributionLabel } from "@/lib/garage-pilot";
import { buildGarageVehicleIdentity } from "@/lib/garage-vehicle-identity";
import {
  formatOwnershipPeriod,
  displayVehicleModel,
  getOwnJournals,
  groupVehiclesByOwnership,
  journalOccurrenceDate,
  journalOccurrenceLabel,
  maintenanceRecordDateKey,
  maintenanceRecordDateLabel,
  preferSharedJournalMediaForDisplay,
  resolveJournalDisplayContent,
  type JournalEventType,
  type JournalIssueStatus,
  type JournalMediaAttachment,
  type MaintenanceServiceAttributionV1,
  type ResolutionStatus,
  type Vehicle,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowLeftRight, Bike, Camera, CarFront, CheckCircle2, History, Pencil, Plus, RotateCcw, Share2 } from "lucide-react";
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
    sharedJournals,
    workspaceLoadState,
    retryWorkspace,
    resetDemo,
    recordEngagement,
    ensureSocialData,
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
    if (signedIn && isRemoteAlpha && workspaceLoadState === "ready") {
      void ensureSocialData().catch(() => undefined);
    }
  }, [ensureSocialData, isRemoteAlpha, signedIn, workspaceLoadState]);
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
  const vehicleModel = displayVehicleModel(vehicle, locale);
  const vehicleLabel = `${vehicle.make} ${vehicleModel}`;
  const continuityIdentity = buildGarageVehicleIdentity(vehicle, locale);
  const isPreviousVehicle = vehicle.ownershipType === "previously_owned";
  const ownershipPeriod = formatOwnershipPeriod(vehicle, locale);
  const timeline: GarageTimelineItem[] = [
    ...journals.map((journal) => {
      // The local workspace may retain a device-only media reference while the
      // alpha-visible journal has the corresponding shared Storage reference.
      // Use the same hydrated display representation as Journal detail and feed.
      const displayJournal = preferSharedJournalMediaForDisplay(
        journal,
        sharedJournals.find((item) => item.id === journal.id),
      );
      const display = resolveJournalDisplayContent(data, displayJournal, locale);
      return ({
        id: journal.id,
        kind: "journal" as const,
        date: journalOccurrenceDate(journal),
        dateLabel: journalOccurrenceLabel(journal, locale),
        title: display.title,
        body: display.body,
        eventType: journal.eventType,
        issueStatus: journal.issueStatus,
        href: `/journal/${journal.id}`,
        media: displayJournal.media.filter((attachment) => attachment.kind === "image"),
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
      resolutionStatus: record.resolutionStatus,
      serviceAttribution: record.serviceAttribution,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  const historyItems: VehicleExperienceMark[] = timeline.slice(0, 12).map((item, index) => {
    const isIssue = item.kind === "journal" && item.eventType === "issue";
    const isUnresolved = isIssue
      ? item.issueStatus === "open"
      : item.kind === "record" && item.resolutionStatus === "unresolved";
    const attribution = garageServiceAttributionLabel(item.serviceAttribution, locale);
    return {
      id: `${item.kind}-${item.id}`,
      dateLabel: item.dateLabel,
      dateTime: item.date,
      label: item.kind === "record" ? (ja ? "整備" : "Maintenance") : eventTypeLabel(item.eventType, ja),
      title: item.title || item.body || (ja ? "記録" : "Record"),
      detail: item.body && item.body !== item.title ? item.body : undefined,
      actor: attribution
        ? { role: ja ? "作業" : "Work", name: attribution }
        : item.kind === "journal" && owner?.displayName
          ? { role: ja ? "記録" : "Recorded by", name: owner.displayName }
          : undefined,
      status: isUnresolved ? (ja ? "未解決" : "Unresolved") : undefined,
      kind: isIssue ? "issue" : item.kind === "record" ? "work" : "record",
      href: item.href,
      media: item.kind === "journal" && item.media?.some((attachment) => attachment.kind === "image")
        ? <JournalMedia attachments={item.media} locale={locale} compact />
        : undefined,
      featured: index === 0,
    };
  });

  return (
    <div className="page-stack garage-v2">
      <DemoNotice />
      {momentAdded && (
        <div className="lovable-success" role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div><strong>{ja ? "記録を追加しました。" : "Record added."}</strong><span>{ja ? "このクルマの経験として保存しました。" : "It is now kept as part of this vehicle's experience."}</span></div>
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
          <GarageVehicleIdentity
            vehicle={vehicle}
            locale={locale}
            ownerDisplayName={owner?.displayName}
            ownerImagePath={owner?.profileImagePath}
          />
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
          <h2>{ja ? "このクルマに残った経験" : "Experience kept with this vehicle"}</h2>
          <p>{timeline.length ? (ja ? "時点と関わった人を、車両を中心に読み返せます。" : "Review each moment and the people involved, with the vehicle kept at the center.") : (ja ? "最初の記録を残しましょう。" : "Add the first record when you are ready.")}</p>
        </div>
        {timeline.length ? (
          <div className="garage-v2-timeline">
            <VehicleContinuity
              label={ja ? `${vehicleLabel}に残った経験` : `Experience kept with ${vehicleLabel}`}
              ledgerLabel={ja ? "この個体の記録" : "Records for this individual vehicle"}
              identity={{
                make: continuityIdentity.make,
                model: [continuityIdentity.model, continuityIdentity.grade].filter(Boolean).join(" "),
                context: [continuityIdentity.modelCode, continuityIdentity.year].filter(Boolean).join(" / ") || undefined,
                badge: ja ? "車両" : "Vehicle",
                objectLabel: ja ? "この個体" : "This individual vehicle",
              }}
              experiences={historyItems}
              continuation={{
                label: ja ? "この先" : "What comes next",
                title: ja ? "次の経験をここへ続けられます" : "The next experience can continue here",
                description: ja ? "まだ記録はありません。" : "Nothing has been recorded here yet.",
              }}
            />
            {timeline.length > 12 && <p className="garage-v2-timeline-note">{ja ? `最近の12件を表示しています。` : "Showing the most recent 12 moments."}</p>}
          </div>
        ) : (
          <div className="garage-v2-empty-history">
            <div><p>{ja ? "まだ記録がありません。" : "No records yet."}</p><h3>{isPreviousVehicle ? (ja ? "覚えている出来事を残す" : "Add what you remember") : (ja ? "このクルマの最初の記録を残す" : "Add the first record for this vehicle")}</h3><span>{isPreviousVehicle ? (ja ? "修理、ドライブ、手放した日のことなど、分かる範囲から残せます。" : "Record a repair, drive, or final day from what you remember.") : (ja ? "整備、写真、短いドライブなどを、このクルマの履歴として残せます。" : "Keep maintenance, photos, and short drives in this vehicle history.")}</span><Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action">{ja ? "このクルマの記録を残す" : "Add a record"}</Link></div>
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
  issueStatus?: JournalIssueStatus;
  resolutionStatus?: ResolutionStatus;
  href: string;
  media?: JournalMediaAttachment[];
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
    delivery: ["納車・購入", "Delivery / purchase"], photo: ["今日の一枚", "Photo of the day"], drive: ["ドライブ", "Drive"], issue: ["不具合・気になること", "Issue / something noticed"], inspection: ["車検・点検", "Inspection"], tire: ["タイヤ交換", "Tires"], oil: ["オイル交換", "Oil change"], breakdown: ["故障", "Breakdown"], repair: ["修理", "Repair"], part: ["部品交換", "Parts"], custom: ["カスタム", "Custom"], event: ["イベント参加", "Event"], memory: ["思い出", "Memory"], other: ["出来事", "Moment"],
  };
  const label = labels[value ?? "other"];
  return ja ? label[0] : label[1];
}
