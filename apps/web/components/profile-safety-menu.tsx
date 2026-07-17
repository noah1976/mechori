"use client";

import { Ban, Ellipsis, Flag, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ProfileSafetyMenu({
  profileName,
  muted,
  blocked,
  ja,
  onToggleMute,
  onToggleBlock,
  reportHref,
}: {
  profileName: string;
  muted: boolean;
  blocked: boolean;
  ja: boolean;
  onToggleMute(): void;
  onToggleBlock(): void;
  reportHref?: string;
}) {
  const [confirmingBlock, setConfirmingBlock] = useState(false);

  function toggleBlock() {
    if (!blocked) {
      setConfirmingBlock(true);
      return;
    }
    onToggleBlock();
  }

  return (
    <details className="profile-safety-menu">
      <summary
        className="icon-action"
        title={ja ? "表示と安全の設定" : "Visibility and safety settings"}
        aria-label={ja ? `${profileName}の表示と安全の設定` : `Visibility and safety settings for ${profileName}`}
      >
        <Ellipsis size={18} aria-hidden="true" />
      </summary>
      {confirmingBlock ? (
        <div role="alertdialog" aria-label={ja ? "ブロックの確認" : "Confirm block"} className="profile-block-confirm">
          <p>
            {ja
              ? `${profileName}をブロックすると、プロフィールと車両のフォローも解除されます。`
              : `Blocking ${profileName} also removes their profile and vehicle follows.`}
          </p>
          <div>
            <button type="button" onClick={() => setConfirmingBlock(false)}>
              {ja ? "キャンセル" : "Cancel"}
            </button>
            <button
              type="button"
              className="danger-menu-action"
              onClick={() => {
                onToggleBlock();
                setConfirmingBlock(false);
              }}
            >
              <Ban size={16} aria-hidden="true" />
              {ja ? "ブロック" : "Block"}
            </button>
          </div>
        </div>
      ) : (
        <div role="menu">
          {reportHref && (
            <Link href={reportHref} role="menuitem">
              <Flag size={16} aria-hidden="true" />
              {ja ? "この投稿を通報" : "Report this post"}
            </Link>
          )}
          <button type="button" role="menuitem" onClick={onToggleMute} disabled={blocked}>
            {muted ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            {muted
              ? ja ? "ミュートを解除" : "Unmute"
              : ja ? "ミュート" : "Mute"}
          </button>
          <button type="button" role="menuitem" className="danger-menu-action" onClick={toggleBlock}>
            <Ban size={16} aria-hidden="true" />
            {blocked
              ? ja ? "ブロックを解除" : "Unblock"
              : ja ? "ブロック" : "Block"}
          </button>
        </div>
      )}
    </details>
  );
}
