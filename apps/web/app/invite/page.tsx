"use client";

import Image from "next/image";
import QRCode from "qrcode";
import {
  Check,
  Clipboard,
  Link2,
  LoaderCircle,
  QrCode,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  invitationValidityDays,
} from "@/lib/invitation-link";
import { memberInvitationErrorMessage } from "@/lib/member-invitation-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { requiresGoogleOAuthTestUserRegistration } from "@/lib/runtime-config";

type ActiveInvitation = {
  id: string;
  created_at: string;
  expires_at: string;
};

async function fetchActiveInvitations(): Promise<ActiveInvitation[] | null> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_my_active_member_invitations",
  );
  if (error) return null;
  return Array.isArray(data) ? data as ActiveInvitation[] : [];
}

export default function InvitePage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const googleTestUserRequired = requiresGoogleOAuthTestUserRegistration();
  const [creating, setCreating] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(isRemoteAlpha);
  const [activeInvitations, setActiveInvitations] = useState<ActiveInvitation[]>([]);
  const [currentInvitationId, setCurrentInvitationId] = useState("");
  const [confirmingRevokeId, setConfirmingRevokeId] = useState("");
  const [revokingId, setRevokingId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const loadActiveInvitations = useCallback(async () => {
    if (!isRemoteAlpha) return;
    const invitations = await fetchActiveInvitations();
    if (invitations) setActiveInvitations(invitations);
    setLoadingInvitations(false);
  }, [isRemoteAlpha]);

  useEffect(() => {
    if (!isRemoteAlpha) return;
    let cancelled = false;
    void fetchActiveInvitations().then((invitations) => {
      if (cancelled) return;
      if (invitations) setActiveInvitations(invitations);
      setLoadingInvitations(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isRemoteAlpha]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRemoteAlpha || creating) return;
    setCreating(true);
    setError("");

    try {
      const rawToken = createInvitationToken();
      const tokenHash = await hashInvitationToken(rawToken);
      const { data: invitationId, error: createError } = await createSupabaseBrowserClient().rpc(
        "create_member_invitation",
        {
          p_token_hash: tokenHash,
          p_expires_at: invitationExpiresAt(),
        },
      );
      if (createError) throw createError;

      const url = buildInvitationUrl(window.location.origin, rawToken);
      setCurrentInvitationId(String(invitationId ?? ""));
      setInviteUrl(url);
      setQrDataUrl("");
      setShowQr(false);
      setCopied(false);
      await loadActiveInvitations();
      try {
        const qr = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 280,
          color: { dark: "#202321", light: "#ffffff" },
        });
        setQrDataUrl(qr);
      } catch {
        setError(ja ? "URLは発行できましたが、QRを作成できませんでした。URLをコピーして送ってください。" : "The link was created, but its QR code could not be generated. Copy and send the link instead.");
      }
    } catch (cause) {
      setError(memberInvitationErrorMessage(cause, ja));
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (revokingId) return;
    setRevokingId(invitationId);
    setError("");
    const { data, error: revokeError } = await createSupabaseBrowserClient().rpc(
      "revoke_my_member_invitation",
      { p_invitation_id: invitationId },
    );
    if (revokeError || data !== true) {
      setError(
        ja
          ? "招待を取り消せませんでした。使用済みでないか確認し、もう一度お試しください。"
          : "The invitation could not be revoked. Check whether it has already been used, then try again.",
      );
    } else {
      if (currentInvitationId === invitationId) {
        setCurrentInvitationId("");
        setInviteUrl("");
        setQrDataUrl("");
        setShowQr(false);
        setCopied(false);
      }
      setConfirmingRevokeId("");
      await loadActiveInvitations();
    }
    setRevokingId("");
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError(ja ? "コピーできませんでした。URLを選択してコピーしてください。" : "Could not copy. Select and copy the URL manually.");
    }
  }

  async function shareInvitation() {
    if (!navigator.share) {
      await copyInvitation();
      return;
    }
    try {
      await navigator.share({
        title: ja ? "MECHORIへの招待" : "Invitation to MECHORI",
        text: ja ? "MECHORIの招待URLです。" : "Here is your invitation to MECHORI.",
        url: inviteUrl,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(ja ? "共有画面を開けませんでした。URLをコピーして送ってください。" : "Could not open sharing. Copy and send the link instead.");
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">INVITE</span>
          <h1>{ja ? "友人をMECHORIへ招待" : "Invite a friend to MECHORI"}</h1>
          <p>{ja ? "相手専用の招待URLを作り、LINEやメッセージで送れます。" : "Create a private invitation link and send it by message."}</p>
        </div>
        <UserPlus size={29} aria-hidden="true" />
      </header>

      <form className="vehicle-form" onSubmit={createInvitation}>
        <section className="form-section invite-intro">
          <div className="section-heading compact">
            <div><span className="eyebrow">ONE PERSON</span><h2>{ja ? "1人だけが使える招待" : "An invitation for one person"}</h2></div>
            <Link2 size={22} aria-hidden="true" />
          </div>
          <p>{ja ? `URLは${invitationValidityDays}日間有効で、1つのGoogleアカウントが登録すると使用済みになります。` : `The link is valid for ${invitationValidityDays} days and is consumed when one Google account joins.`}</p>
          <p className="privacy-caption">{ja ? "URLを受け取った本人にだけ送ってください。SNSへの公開投稿には載せないでください。" : "Send it only to the intended person. Do not post it publicly on social media."}</p>
          <p className="privacy-caption">
            {googleTestUserRequired
              ? (ja
                  ? "現在はGoogle OAuthのテスト中です。相手のGoogleアカウントをGoogleのテストユーザーへ追加する運営作業も必要です。"
                  : "Google OAuth is currently in testing. The operator must also add the person's Google account as a Google test user.")
              : (ja
                  ? "Googleへの事前登録は不要です。この招待URLだけを本人へ送ってください。"
                  : "No Google pre-registration is required. Send only this invitation link to the intended person.")}
          </p>
        </section>

        {inviteUrl && (
          <section className="form-section invite-result" aria-live="polite">
            <div className="section-heading compact">
              <div><span className="eyebrow">READY</span><h2>{ja ? "招待の準備ができました" : "Your invitation is ready"}</h2></div>
              <Check size={22} aria-hidden="true" />
            </div>
            <label className="field">
              <span>{ja ? "招待URL（この画面を閉じると再表示できません）" : "Invitation URL (shown only now)"}</span>
              <textarea readOnly value={inviteUrl} rows={4} onFocus={(event) => event.currentTarget.select()} />
            </label>
            <div className="invite-actions">
              <button type="button" className="primary-action" onClick={() => void shareInvitation()}><Share2 size={18} />{ja ? "共有" : "Share"}</button>
              <button type="button" className="secondary-action" onClick={() => void copyInvitation()}>{copied ? <Check size={18} /> : <Clipboard size={18} />}{copied ? (ja ? "コピー済み" : "Copied") : (ja ? "URLをコピー" : "Copy link")}</button>
              {qrDataUrl && <button type="button" className="secondary-action" onClick={() => setShowQr((current) => !current)} aria-expanded={showQr}><QrCode size={18} />{showQr ? (ja ? "QRを閉じる" : "Hide QR") : (ja ? "QRを表示" : "Show QR")}</button>}
            </div>
            {showQr && qrDataUrl && (
              <div className="invite-qr">
                <Image src={qrDataUrl} width={280} height={280} unoptimized alt={ja ? "MECHORI招待URLのQRコード" : "QR code for the MECHORI invitation link"} />
                <p>{ja ? "相手のスマートフォンで読み取ってもらえます。" : "Your friend can scan this with their phone."}</p>
              </div>
            )}
          </section>
        )}

        <section className="form-section invite-active-list" aria-live="polite">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">ACTIVE</span>
              <h2>{ja ? "未使用の招待" : "Unused invitations"}</h2>
            </div>
            <span className="invite-active-count">
              {loadingInvitations ? "..." : activeInvitations.length}
            </span>
          </div>
          <p className="privacy-caption">
            {ja
              ? "安全のため、閉じた画面のURL本体は再表示できません。まだ送っていない招待は取り消して、発行し直せます。"
              : "For security, a link cannot be shown again after you close its page. Revoke any unsent invitation and create a new one."}
          </p>
          {!loadingInvitations && activeInvitations.length === 0 && (
            <p className="invite-active-empty">
              {ja ? "未使用の招待はありません。" : "You have no unused invitations."}
            </p>
          )}
          <div className="invite-active-rows">
            {activeInvitations.map((invitation) => (
              <div className="invite-active-row" key={invitation.id}>
                <div>
                  <strong>
                    {currentInvitationId === invitation.id
                      ? (ja ? "この画面で表示中" : "Shown on this page")
                      : (ja ? "発行済みの招待" : "Issued invitation")}
                  </strong>
                  <span>
                    {ja ? "発行" : "Created"}: {formatInvitationDate(invitation.created_at, locale)}
                    {" / "}
                    {ja ? "期限" : "Expires"}: {formatInvitationDate(invitation.expires_at, locale)}
                  </span>
                </div>
                {confirmingRevokeId === invitation.id ? (
                  <div className="invite-revoke-confirm">
                    <span>{ja ? "このURLを無効にしますか？" : "Disable this link?"}</span>
                    <button
                      type="button"
                      className="text-danger-action"
                      disabled={revokingId === invitation.id}
                      onClick={() => void revokeInvitation(invitation.id)}
                    >
                      {revokingId === invitation.id
                        ? <LoaderCircle className="spin" size={16} />
                        : <Trash2 size={16} />}
                      {ja ? "取り消す" : "Revoke"}
                    </button>
                    <button
                      type="button"
                      className="icon-text-button"
                      disabled={Boolean(revokingId)}
                      onClick={() => setConfirmingRevokeId("")}
                    >
                      {ja ? "戻る" : "Back"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-danger-action"
                    onClick={() => setConfirmingRevokeId(invitation.id)}
                  >
                    <Trash2 size={16} />
                    {ja ? "取り消す" : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary-action" disabled={creating || !isRemoteAlpha}>
            {creating ? <LoaderCircle className="spin" size={18} /> : <UserPlus size={18} />}
            {creating ? (ja ? "発行中" : "Creating") : inviteUrl ? (ja ? "別の招待URLを発行" : "Create another link") : (ja ? "招待URLを発行" : "Create invitation link")}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatInvitationDate(value: string, locale: "ja" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
