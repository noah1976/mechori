"use client";

import { JournalForm } from "@/components/journal-form";
import { JournalPrompts } from "@/components/journal-prompts";
import { QuickRecordEntry } from "@/components/quick-record-entry";
import { useApp } from "@/lib/app-context";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NewJournalPage() {
  return <Suspense fallback={null}><NewJournalContent /></Suspense>;
}

function NewJournalContent() {
  const { locale } = useApp();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle") ?? undefined;
  const promptId = searchParams.get("prompt") ?? undefined;
  const detailed = searchParams.get("mode") === "detailed" || Boolean(promptId);
  const ja = locale === "ja";

  if (!detailed) return <QuickRecordEntry initialVehicleId={vehicleId} />;

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">DETAILED RECORD</span>
          <h1>{ja ? "愛車のことを詳しく記録する" : "Write a detailed vehicle record"}</h1>
          <p>
            {ja
              ? "タイトル、長い文章、複数の写真や動画を追加したいときに使います。"
              : "Use this when you want a title, longer text, or multiple photos and videos."}
          </p>
        </div>
        {vehicleId && (
          <Link href={`/journal/new?vehicle=${encodeURIComponent(vehicleId)}`} className="secondary-action">
            <Camera size={17} aria-hidden="true" />
            {ja ? "通常の記録に戻る" : "Back to quick record"}
          </Link>
        )}
      </header>
      {!promptId && <JournalPrompts vehicleId={vehicleId} />}
      <JournalForm vehicleId={vehicleId} promptId={promptId} />
    </div>
  );
}
