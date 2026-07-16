"use client";

import { useApp } from "@/lib/app-context";
import { classifyJournalForKnowledge } from "@mechori/core";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Gauge,
  Heart,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { JournalContent } from "@/components/journal-content";

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale } = useApp();
  const ja = locale === "ja";
  const journal = data.journals.find((item) => item.id === id);
  if (!journal) {
    return (
      <div className="empty-state">
        <h1>{ja ? "Journalが見つかりません" : "Journal not found"}</h1>
        <Link href="/feed" className="secondary-action">
          {ja ? "フィードへ戻る" : "Back to feed"}
        </Link>
      </div>
    );
  }

  const author = data.profiles.find(
    (profile) => profile.id === journal.authorProfileId,
  );
  const record = data.records.find((item) => item.id === journal.linkedRecordId);
  const knowledgeClass = classifyJournalForKnowledge(journal);

  return (
    <div className="page-stack journal-detail-page">
      <Link href="/feed" className="back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        {ja ? "フォロー中へ戻る" : "Back to following"}
      </Link>

      <article className="journal-detail">
        <header>
          <div className="journal-author-line">
            <span className="journal-avatar" aria-hidden="true">
              {(author?.displayName ?? "M").slice(0, 1).toLocaleUpperCase()}
            </span>
            <div>
              <strong>{author?.displayName}</strong>
              <small>{journal.vehicleLabel}</small>
            </div>
            {journal.isDemo && <span className="demo-label">DEMO</span>}
          </div>
          <h1>{journal.title}</h1>
          <div className="journal-detail-meta">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
                dateStyle: "medium",
              }).format(new Date(journal.createdAt))}
            </span>
            <span>
              {journal.visibility === "private" ? (
                <Lock size={16} aria-hidden="true" />
              ) : journal.visibility === "followers" ? (
                <Users size={16} aria-hidden="true" />
              ) : (
                <BookOpen size={16} aria-hidden="true" />
              )}
              {visibilityLabel(journal.visibility, ja)}
            </span>
            <span>
              <Heart size={16} aria-hidden="true" />
              {journal.appreciationCount}
            </span>
          </div>
        </header>

        <JournalContent journal={journal} locale={locale} />
      </article>

      {record && (
        <section className="linked-record-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">LINKED RECORD</span>
              <h2>{ja ? "関連する整備記録" : "Related maintenance record"}</h2>
            </div>
            <Link2 size={22} aria-hidden="true" />
          </div>
          <div className="linked-record-facts">
            {journal.displayFields.includes("service_date") && (
              <div>
                <CalendarDays size={18} aria-hidden="true" />
                <span>{ja ? "整備日" : "Service date"}</span>
                <strong>{record.serviceDate}</strong>
              </div>
            )}
            {journal.displayFields.includes("odometer") && (
              <div>
                <Gauge size={18} aria-hidden="true" />
                <span>{ja ? "走行距離" : "Odometer"}</span>
                <strong>
                  {record.odometerReading.displayedValue.toLocaleString()} {record.odometerReading.unit}
                </strong>
              </div>
            )}
            {journal.displayFields.includes("actions") && (
              <div>
                <Wrench size={18} aria-hidden="true" />
                <span>{ja ? "整備箇所・作業" : "Maintenance actions"}</span>
                <strong>{record.actions.map((action) => action.summary).join(" / ")}</strong>
              </div>
            )}
          </div>
          <Link href={`/records/${record.id}`} className="text-link">
            {ja ? "整備記録を確認" : "View maintenance record"}
          </Link>
        </section>
      )}

      <section className="journal-knowledge-note">
        {knowledgeClass === "related_owner_record" ? (
          <Sparkles size={22} aria-hidden="true" />
        ) : (
          <ShieldCheck size={22} aria-hidden="true" />
        )}
        <div>
          <strong>
            {knowledgeClass === "related_owner_record"
              ? ja
                ? "関連するオーナー記録としてのみ参照可能"
                : "May be referenced only as a related owner record"
              : ja
                ? "ナレッジ検索には使用されません"
                : "Not available to knowledge search"}
          </strong>
          <p>
            {ja
              ? "Journalの人気やAI抽出だけで、確認済みナレッジや原因候補へ昇格することはありません。"
              : "Popularity or AI extraction alone can never promote a journal to verified knowledge or a confirmed cause."}
          </p>
        </div>
      </section>
    </div>
  );
}

function visibilityLabel(value: string, ja: boolean): string {
  if (value === "private") return ja ? "非公開" : "Private";
  if (value === "followers") return ja ? "フォロワー限定" : "Followers only";
  return ja ? "公開" : "Public";
}
