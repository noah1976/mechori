"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAlphaActivityTrackingEnabled } from "@/lib/runtime-config";
import { Check, Clipboard, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";

type AccessState = "loading" | "operator" | "denied" | "error";

export default function AlphaSettingsPage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const [access, setAccess] = useState<AccessState>("loading");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<{ mau: number; valueMau: number } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAccess() {
      if (!isRemoteAlpha) {
        if (active) setAccess("denied");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error: roleError } = await supabase
        .from("app_user_roles")
        .select("role_code")
        .in("role_code", ["owner", "alpha_admin"]);
      if (!active) return;
      if (roleError) setAccess("error");
      else setAccess(data.length > 0 ? "operator" : "denied");
    }
    void loadAccess();
    return () => {
      active = false;
    };
  }, [isRemoteAlpha]);

  useEffect(() => {
    if (access !== "operator" || !isAlphaActivityTrackingEnabled()) return;
    let active = true;
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
    async function loadMetrics() {
      const result = await createSupabaseBrowserClient().rpc(
        "get_alpha_monthly_metrics",
        { p_month: monthStart },
      ) as {
        data: Array<{ mau: number | string; value_mau: number | string }> | null;
        error: unknown;
      };
      if (!active || result.error || !result.data?.[0]) return;
      setMetrics({
        mau: Number(result.data[0].mau),
        valueMau: Number(result.data[0].value_mau),
      });
    }
    void loadMetrics();
    return () => {
      active = false;
    };
  }, [access]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (access !== "operator" || creating) return;
    setCreating(true);
    setError("");
    setInviteUrl("");
    setCopied(false);
    try {
      const days = Number(expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error("invalid_expiry");
      const rawToken = randomToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error: createError } = await createSupabaseBrowserClient().rpc(
        "create_test_invitation",
        {
          p_token_hash: tokenHash,
          p_phase: "alpha",
          p_expires_at: expiresAt,
          p_max_redemptions: 1,
        },
      );
      if (createError) throw createError;
      const url = new URL("/auth", window.location.origin);
      url.searchParams.set("mode", "signup");
      url.hash = new URLSearchParams({ invite: rawToken }).toString();
      setInviteUrl(url.toString());
    } catch {
      setError(ja ? "招待URLを発行できませんでした。もう一度お試しください。" : "The invitation link could not be created. Please try again.");
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

  if (access === "loading") {
    return <div className="app-loading"><LoaderCircle className="spin" size={24} /><span>{ja ? "権限を確認中" : "Checking access"}</span></div>;
  }

  if (access !== "operator") {
    return (
      <div className="page-stack narrow-page">
        <div className="empty-state">
          <ShieldCheck size={32} aria-hidden="true" />
          <h1>{ja ? "オーナー専用の画面です" : "Owner access only"}</h1>
          <p>{access === "error" ? (ja ? "権限を確認できませんでした。" : "Access could not be checked.") : (ja ? "このアカウントでは招待を発行できません。" : "This account cannot issue invitations.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div><span className="eyebrow">ALPHA ACCESS</span><h1>{ja ? "αテスターを招待" : "Invite an alpha tester"}</h1><p>{ja ? "招待する相手ごとに、新しいURLを1本ずつ発行してください。" : "Create one new link for each person you invite."}</p></div>
      </header>
      <section className="garage-stats" aria-label={ja ? "今月のα利用状況" : "Alpha usage this month"}>
        <div><strong>{metrics?.mau ?? "-"}</strong><span>MAU</span></div>
        <div><strong>{metrics?.valueMau ?? "-"}</strong><span>Value MAU</span></div>
        <div><strong>{metrics && metrics.mau ? `${Math.round((metrics.valueMau / metrics.mau) * 100)}%` : "-"}</strong><span>Value MAU Rate</span></div>
      </section>
      {!isAlphaActivityTrackingEnabled() && <p className="privacy-caption">{ja ? "月次計測はDB更新と環境設定が完了するまで無効です。" : "Monthly measurement remains disabled until its database update and environment setting are complete."}</p>}
      <form className="vehicle-form" onSubmit={createInvitation}>
        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">SINGLE USE</span><h2>{ja ? "1人用の招待URL" : "Single-use invitation"}</h2></div><Link2 size={22} aria-hidden="true" /></div>
          <label className="field">
            <span>{ja ? "有効日数" : "Valid for"}</span>
            <select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)}>
              <option value="1">1{ja ? "日" : " day"}</option>
              <option value="3">3{ja ? "日" : " days"}</option>
              <option value="7">7{ja ? "日" : " days"}</option>
              <option value="14">14{ja ? "日" : " days"}</option>
              <option value="30">30{ja ? "日" : " days"}</option>
            </select>
          </label>
          <p className="privacy-caption">{ja ? "URLは1アカウントが参加すると使用済みになります。Googleのテストユーザー登録も別途必要です。" : "The URL is consumed after one account joins. The person must also be added as a Google test user."}</p>
        </section>
        {inviteUrl && (
          <section className="form-section">
            <div className="section-heading compact"><div><span className="eyebrow">READY</span><h2>{ja ? "このURLを相手へ送る" : "Send this link"}</h2></div></div>
            <label className="field"><span>{ja ? "招待URL（この画面を閉じると再表示できません）" : "Invitation URL (shown only now)"}</span><textarea readOnly value={inviteUrl} rows={4} /></label>
            <button type="button" className="secondary-action" onClick={() => void copyInvitation()}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? (ja ? "コピーしました" : "Copied") : (ja ? "URLをコピー" : "Copy link")}</button>
          </section>
        )}
        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions"><button type="submit" className="primary-action" disabled={creating}>{creating ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}{creating ? (ja ? "発行中" : "Creating") : (ja ? "新しい招待URLを発行" : "Create invitation link")}</button></div>
      </form>
    </div>
  );
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
