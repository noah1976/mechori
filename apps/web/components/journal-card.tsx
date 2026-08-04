"use client";

import {
  journalMediaForViewer,
  journalOccurrenceLabel,
  preferSharedJournalMediaForDisplay,
  resolveJournalDisplayContent,
} from "@mechori/core";
import type {
  ContentTranslation,
  GarageJournalPost,
  Locale,
  MaintenanceRecord,
  SocialProfile,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowRight, BookOpen, Heart, Link2, Lock, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { JournalMedia } from "@/components/journal-media";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileSafetyMenu } from "@/components/profile-safety-menu";
import { useApp } from "@/lib/app-context";

export function JournalCard({
  journal,
  sharedJournal,
  author,
  record,
  locale,
  safety,
  mediaPriority = false,
  translations = [],
  authorLinkEnabled = true,
  alphaAudience = false,
  showPrivateMedia = false,
}: {
  journal: GarageJournalPost;
  sharedJournal?: GarageJournalPost;
  author?: SocialProfile;
  record?: MaintenanceRecord;
  locale: Locale;
  mediaPriority?: boolean;
  translations?: ContentTranslation[];
  authorLinkEnabled?: boolean;
  alphaAudience?: boolean;
  showPrivateMedia?: boolean;
  safety?: {
    muted: boolean;
    blocked: boolean;
    onToggleMute(): void;
    onToggleBlock(): void;
  };
}) {
  const { data, signedIn, isRemoteAlpha, journalReaction, toggleJournalLike } = useApp();
  const [reacting, setReacting] = useState(false);
  const [reactionError, setReactionError] = useState(false);
  const ja = locale === "ja";
  const displayJournal = preferSharedJournalMediaForDisplay(journal, sharedJournal);
  const display = resolveJournalDisplayContent(
    { contentTranslations: translations },
    displayJournal,
    locale,
  );
  const visibleMedia = journalMediaForViewer(displayJournal, showPrivateMedia);
  const remoteReaction = journalReaction(displayJournal.id);
  const appreciationCount = isRemoteAlpha
    ? remoteReaction.appreciationCount
    : displayJournal.appreciationCount;
  const canReact =
    signedIn &&
    isRemoteAlpha &&
    displayJournal.authorProfileId !== data.currentProfileId;
  const isOwnJournal =
    isRemoteAlpha &&
    displayJournal.authorProfileId === data.currentProfileId;
  return (
    <article className="journal-card">
      <Link
        href={`/journal/${displayJournal.id}`}
        className="journal-card-hit-area"
        aria-label={ja ? `${display.title}の詳細を読む` : `Read ${display.title}`}
      />
      <div className="journal-card-meta">
        <ProfileAvatar
          displayName={author?.displayName ?? "M"}
          imagePath={author?.profileImagePath}
          className="journal-avatar"
        />
        <div>
          <strong>
            {author && authorLinkEnabled ? (
              <Link href={`/profile/${author.id}`}>{author.displayName}</Link>
            ) : author ? author.displayName : ja ? "不明な投稿者" : "Unknown author"} / {journal.vehicleLabel}
          </strong>
          <small>
            {journalOccurrenceLabel(journal, locale)}
          </small>
        </div>
        <div className="journal-card-actions">
          {displayJournal.isDemo && <span className="demo-label">DEMO</span>}
          {safety && author && (
            <ProfileSafetyMenu
              profileName={author.displayName}
              muted={safety.muted}
              blocked={safety.blocked}
              ja={ja}
              onToggleMute={safety.onToggleMute}
              onToggleBlock={safety.onToggleBlock}
              reportHref={`/journal/${journal.id}/report`}
            />
          )}
        </div>
      </div>
      <JournalMedia attachments={visibleMedia} locale={locale} compact priority={mediaPriority} />
      <h3>{display.title}</h3>
      <p>{display.body}</p>
      {!display.translated && display.sourceLanguage !== locale && (
        <small className="translation-note">
          {ja ? "原文のまま表示しています" : `Shown in the original (${display.sourceLanguage})`}
        </small>
      )}
      {record && (
        <div className="journal-record-link">
          <Link2 size={15} aria-hidden="true" />
          <span>{ja ? "整備記録にリンク" : "Linked maintenance record"}</span>
          <strong>{record.summary}</strong>
        </div>
      )}
      <footer>
        <span>
          {displayJournal.visibility === "private" ? (
            <Lock size={15} aria-hidden="true" />
          ) : displayJournal.visibility === "followers" ? (
            <Users size={15} aria-hidden="true" />
          ) : (
            <BookOpen size={15} aria-hidden="true" />
          )}
          {displayJournal.visibility === "followers"
            ? translate(locale, "followersOnly")
            : displayJournal.visibility === "public" && alphaAudience
              ? ja ? "α参加者に公開" : "Shared with alpha participants"
              : translate(locale, displayJournal.visibility)}
        </span>
        {isOwnJournal ? (
          <span className="journal-like-status">
            <Heart size={15} aria-hidden="true" />
            {appreciationCount}
          </span>
        ) : (
          <button
            type="button"
            className={remoteReaction.likedByMe ? "journal-like is-liked" : "journal-like"}
            aria-pressed={remoteReaction.likedByMe}
            aria-label={ja ? "この記録にいいね" : "Like this record"}
            disabled={!canReact || reacting}
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!canReact || reacting) return;
              setReacting(true);
              setReactionError(false);
              try {
                await toggleJournalLike(displayJournal.id);
              } catch {
                setReactionError(true);
              } finally {
                setReacting(false);
              }
            }}
          >
            <Heart size={15} aria-hidden="true" />
            {appreciationCount}
          </button>
        )}
        <Link href={`/journal/${displayJournal.id}`} className="text-link">
          {ja ? "読む" : "Read"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
      {reactionError && <small className="form-error" role="alert">{ja ? "いいねを保存できませんでした。もう一度お試しください。" : "The like could not be saved. Please try again."}</small>}
    </article>
  );
}
