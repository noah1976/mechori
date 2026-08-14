"use client";

import { type GarageJournalPost, type Locale, type Vehicle } from "@mechori/core";
import { ArrowRight, CarFront, CheckCircle2, Home, Plus } from "lucide-react";
import Link from "next/link";

export function JournalCompletion({
  journal,
  vehicle,
  locale,
  mode,
}: {
  journal: GarageJournalPost;
  vehicle?: Vehicle;
  locale: Locale;
  mode: "detailed" | "quick";
}) {
  const ja = locale === "ja";
  const vehicleLabel = vehicle?.nickname?.trim() || journal.vehicleLabel;
  const title = journal.title.trim();
  const message = title
    ? ja
      ? `『${title}』が、${vehicleLabel}の記録に加わりました。`
      : `“${title}” was added to ${vehicleLabel}'s story.`
    : ja
      ? `${vehicleLabel}の記録を追加しました。`
      : `A new record was added to ${vehicleLabel}.`;
  const newRecordHref = mode === "quick" && vehicle
    ? `/garage/${encodeURIComponent(vehicle.id)}/event/new`
    : `/journal/new${vehicle ? `?vehicle=${encodeURIComponent(vehicle.id)}` : ""}`;

  return (
    <section className="page-stack narrow-page journal-completion" aria-labelledby="journal-completion-title">
      <div className="lovable-success journal-completion-message" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <div>
          <strong id="journal-completion-title">{ja ? "愛車の記録を追加しました！" : "Your vehicle record was added!"}</strong>
          <span>{message}</span>
        </div>
      </div>
      <div className="journal-completion-actions">
        <Link href={`/garage${vehicle ? `?vehicle=${encodeURIComponent(vehicle.id)}` : ""}`} className="primary-action">
          <CarFront size={17} aria-hidden="true" />
          {ja ? "ガレージで見る" : "View in Garage"}
        </Link>
        <Link href={`/journal/${encodeURIComponent(journal.id)}`} className="secondary-action">
          <ArrowRight size={17} aria-hidden="true" />
          {ja ? "投稿を見る" : "View post"}
        </Link>
        <Link href={newRecordHref} className="secondary-action">
          <Plus size={17} aria-hidden="true" />
          {ja ? "もう1つ記録を残す" : "Add another record"}
        </Link>
        <Link href="/" className="text-link">
          <Home size={16} aria-hidden="true" />
          {ja ? "ホームへ戻る" : "Back home"}
        </Link>
      </div>
    </section>
  );
}
