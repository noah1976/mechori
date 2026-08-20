"use client";

import { JournalForm } from "@/components/journal-form";
import { QuickEventForm } from "@/components/quick-event-form";
import { useApp } from "@/lib/app-context";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function JournalEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale } = useApp();
  const ja = locale === "ja";
  const journal = data.journals.find((item) => item.id === id);
  const vehicle = journal?.vehicleId
    ? data.vehicles.find((item) => item.id === journal.vehicleId)
    : undefined;

  if (!journal || journal.authorProfileId !== data.currentProfileId || !vehicle) {
    return (
      <div className="empty-state">
        <h1>{ja ? "この記録は編集できません" : "This record cannot be edited"}</h1>
        <p>{ja ? "記録が見つからないか、編集できる本人の記録ではありません。" : "The record is missing or does not belong to the current profile."}</p>
        <Link href="/garage" className="primary-action">{ja ? "My Garageへ戻る" : "Back to My Garage"}</Link>
      </div>
    );
  }

  if (journal.captureIntent || journal.eventType) {
    return <QuickEventForm vehicle={vehicle} journal={journal} />;
  }

  return (
    <div className="page-stack journal-editor-page">
      <header className="page-header"><div><span className="eyebrow">EDIT DETAILED RECORD</span><h1>{ja ? "詳しい記録を編集" : "Edit detailed record"}</h1><p>{ja ? "タイトル、本文、日付、公開範囲を後から修正できます。" : "Update the title, story, date, and audience."}</p></div></header>
      <JournalForm journal={journal} />
    </div>
  );
}
