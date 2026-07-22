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
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  invitationValidityDays,
} from "@/lib/invitation-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRemoteAlpha || creating) return;
    setCreating(true);
    setError("");
    setInviteUrl("");
    setQrDataUrl("");
    setShowQr(false);
    setCopied(false);

    try {
      const rawToken = createInvitationToken();
      const tokenHash = await hashInvitationToken(rawToken);
      const { error: createError } = await createSupabaseBrowserClient().rpc(
        "create_member_invitation",
        {
          p_token_hash: tokenHash,
          p_expires_at: invitationExpiresAt(),
        },
      );
      if (createError) throw createError;

      const url = buildInvitationUrl(window.location.origin, rawToken);
      setInviteUrl(url);
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
      const message = errorText(cause);
      setError(invitationErrorMessage(message, ja));
    } finally {
      setCreating(false);
    }
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
          <p className="privacy-caption">{ja ? "現在のα版では、相手のGoogleアカウントをGoogleのテストユーザーへ追加する運営作業が別途必要です。" : "During the current alpha, the person's Google account must also be added as a Google test user by the operator."}</p>
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

function invitationErrorMessage(message: string, ja: boolean): string {
  if (message.includes("active_invitation_limit")) {
    return ja ? "未使用の招待が3件あります。使用または期限切れのあとに、もう一度発行できます。" : "You already have three unused invitations. Create another after one is used or expires.";
  }
  if (message.includes("monthly_invitation_limit")) {
    return ja ? "今月発行できる招待数の上限に達しました。" : "You have reached this month's invitation limit.";
  }
  if (message.includes("active_membership_required")) {
    return ja ? "招待を発行できる参加状態を確認できませんでした。" : "An active membership is required to create invitations.";
  }
  return ja ? "招待URLを発行できませんでした。時間をおいてもう一度お試しください。" : "The invitation link could not be created. Please try again later.";
}

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return String(value);
}
