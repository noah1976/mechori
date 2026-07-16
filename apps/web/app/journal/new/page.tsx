"use client";

import { JournalForm } from "@/components/journal-form";
import { useApp } from "@/lib/app-context";

export default function NewJournalPage() {
  const { locale } = useApp();
  const ja = locale === "ja";
  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">GARAGE JOURNAL</span>
          <h1>{ja ? "愛車との一日を書く" : "Write a day with your car"}</h1>
          <p>
            {ja
              ? "直った日も、路上で止まった日も、あとから愛車の物語になります。文章の好きな場所に写真や動画を添えて、自分の言葉で残してください。"
              : "A successful repair and a roadside breakdown both become part of your car's story. Place photos and videos wherever they belong and write it in your own words."}
          </p>
        </div>
      </header>
      <JournalForm />
    </div>
  );
}
