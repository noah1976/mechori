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
import { journalDetailHref } from "@/lib/journal-detail-route";
import { hasDistinctJournalTitle } from "@/lib/journal-feed-presentation";
import { publicProfileHref } from "@/lib/public-profile-url";

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
  variant = "default",
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
  variant?: "default" | "home";
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
  const authorHref = author && authorLinkEnabled ? publicProfileHref(author) : undefined;
  const detailHref = journalDetailHref(displayJournal.id);
  const vehicleHref = displayJournal.vehicleId
    ? `/garage/${encodeURIComponent(displayJournal.vehicleId)}`
    : displayJournal.vehicleTargetId
      ? `/v/${encodeURIComponent(displayJournal.vehicleTargetId)}`
      : undefined;
  const showTitle = hasDistinctJournalTitle(display.title, display.body);
  const showVisibility = variant !== "home" || displayJournal.visibility !== "public";
  const showReadAction = variant !== "home";
  return (
    <article className={variant === "home" ? "journal-card journal-card-home" : "journal-card"}>
      <Link
        href={detailHref}
        prefetch={false}
        className="journal-card-hit-area"
        aria-label={ja ? `${display.title}の詳細を読む` : `Read ${display.title}`}
      />
      <div className="journal-card-meta">
        {authorHref ? (
          <Link href={authorHref} className="journal-author-link" aria-label={ja ? `${author?.displayName}のガレージ` : `${author?.displayName}'s garage`}>
            <ProfileAvatar
              displayName={author?.displayName ?? "M"}
              imagePath={author?.profileImagePath}
              className="journal-avatar"
            />
          </Link>
        ) : (
          <ProfileAvatar
            displayName={author?.displayName ?? "M"}
            imagePath={author?.profileImagePath}
            className="journal-avatar"
          />
        )}
        <div>
          <strong>
            {authorHref ? (
              <Link href={authorHref}>{author?.displayName}</Link>
            ) : author ? author.displayName : ja ? "不明な投稿者" : "Unknown author"}
          </strong>
          <small>
            {vehicleHref ? <Link href={vehicleHref} className="journal-vehicle-link">{journal.vehicleLabel}</Link> : journal.vehicleLabel}
          </small>
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
      {showTitle && <h3>{display.title}</h3>}
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
      <JournalMedia
        attachments={visibleMedia}
        locale={locale}
        compact
        priority={mediaPriority}
        linkHref={detailHref}
        linkAriaLabel={ja ? `${display.title}の詳細を読む` : `Read ${display.title}`}
      />
      <footer>
        {showVisibility && <span>
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
        </span>}
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
        {showReadAction && <Link href={detailHref} prefetch={false} className="text-link">
          {ja ? "読む" : "Read"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>}
      </footer>
      {reactionError && <small className="form-error" role="alert">{ja ? "いいねを保存できませんでした。もう一度お試しください。" : "The like could not be saved. Please try again."}</small>}
    </article>
  );
}
