"use client";

import { JournalForm } from "@/components/journal-form";
import { JournalPrompts } from "@/components/journal-prompts";
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
  const ja = locale === "ja";
  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">DETAILED RECORD</span>
          <h1>{ja ? "愛車のことを詳しく記録する" : "Write a detailed vehicle record"}</h1>
          <p>
            {ja
              ? "タイトルや長い文章、複数の写真・動画を使いたい記録はこちらです。短い近況は「さっと記録」から残せます。"
              : "Use this for a title, longer text, and multiple photos or videos. Quick updates can use Quick record."}
          </p>
        </div>
        {vehicleId && (
          <Link href={`/garage/${encodeURIComponent(vehicleId)}/event/new`} className="secondary-action">
            <Camera size={17} aria-hidden="true" />
            {ja ? "写真と一言で、さっと記録" : "Quick record with a photo"}
          </Link>
        )}
      </header>
      {!promptId && <JournalPrompts vehicleId={vehicleId} />}
      <JournalForm vehicleId={vehicleId} promptId={promptId} />
    </div>
  );
}
