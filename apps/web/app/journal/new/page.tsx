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
          <h1>{ja ? "愛車のことを書く" : "Write about your car"}</h1>
          <p>
            {ja
              ? "うまくまとめなくても大丈夫です。整備の経緯や、その日に感じたことを自分の言葉で残してください。"
              : "It does not need to sound polished. Keep the experience and what you felt in your own words."}
          </p>
        </div>
      </header>
      <JournalForm />
    </div>
  );
}
