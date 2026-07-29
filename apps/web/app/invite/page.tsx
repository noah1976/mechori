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
import { memberInvitationErrorMessage } from "@/lib/member-invitation-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { requiresGoogleOAuthTestUserRegistration } from "@/lib/runtime-config";

export default function InvitePage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const googleTestUserRequired = requiresGoogleOAuthTestUserRegistration();
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
      setError(memberInvitationErrorMessage(cause, ja));
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
