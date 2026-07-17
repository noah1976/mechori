"use client";

import { useApp } from "@/lib/app-context";
import { sanitizeLocalReturnPath, type AuthProvider } from "@mechori/core";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type AuthMode = "signin" | "signup";

const initialProviders: Array<{ id: AuthProvider; mark: string; ja: string; en: string }> = [
  { id: "google", mark: "G", ja: "Googleで続ける", en: "Continue with Google" },
];

function AuthContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale, signedIn, signIn } = useApp();
  const ja = locale === "ja";
  const [mode, setMode] = useState<AuthMode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [inviteCode, setInviteCode] = useState(params.get("invite") ?? "");
  const [error, setError] = useState("");
  const returnTo = sanitizeLocalReturnPath(params.get("returnTo"));

  function validateInvite(): boolean {
    if (mode === "signin" || inviteCode.trim() === "MECHORI-DEMO") return true;
    setError(ja ? "有効な招待が必要です。" : "A valid invitation is required.");
    return false;
  }

  function complete(provider: AuthProvider) {
    if (!validateInvite()) return;
    setError("");
    signIn(provider);
    router.replace(returnTo);
  }

  if (signedIn) {
    return (
      <div className="auth-page auth-complete">
        <ShieldCheck size={34} aria-hidden="true" />
        <span className="eyebrow">SIGNED IN</span>
        <h1>{ja ? "ログイン済みです" : "You are signed in"}</h1>
        <Link href={returnTo} className="primary-action">
          {ja ? "MECHORIを開く" : "Open MECHORI"}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <header className="auth-heading">
        <span className="auth-mark">M</span>
        <span className="eyebrow">MECHORI ACCOUNT</span>
        <h1>{mode === "signin" ? (ja ? "おかえりなさい" : "Welcome back") : (ja ? "愛車の記録を始める" : "Start your vehicle history")}</h1>
        <p>
          {mode === "signin"
            ? ja ? "自分のGarageと非公開記録へ戻ります。" : "Return to your Garage and private records."
            : ja ? "招待URLを受け取った方だけが参加できるDEMOです。" : "This local demo is limited to invited participants."}
        </p>
      </header>

      <section className="auth-panel">
        <div className="segmented-control" role="group" aria-label={ja ? "アカウント操作" : "Account action"}>
          <button type="button" className={mode === "signin" ? "is-selected" : ""} aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
            {ja ? "ログイン" : "Sign in"}
          </button>
          <button type="button" className={mode === "signup" ? "is-selected" : ""} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
            {ja ? "新規登録" : "Create account"}
          </button>
        </div>

        {mode === "signup" && (
          <label className="auth-field">
            <span>{ja ? "招待コード（招待URLから自動入力）" : "Invitation code"}</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoComplete="one-time-code" />
          </label>
        )}

        <div className="auth-provider-list">
          {initialProviders.map((provider) => (
            <button type="button" key={provider.id} onClick={() => complete(provider.id)}>
              <span className={`provider-mark is-${provider.id}`} aria-hidden="true">{provider.mark}</span>
              <strong>{ja ? provider.ja : provider.en}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="auth-local-note">
          <LockKeyhole size={17} aria-hidden="true" />
          <p>
            <strong>{ja ? "認証画面のDEMO" : "Local authentication demo"}</strong>
            <span>{ja ? "現在はGoogleログインの流れだけを再現しています。実際のGoogleアカウントには接続しません。" : "This screen models Google sign-in without contacting an external service."}</span>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="app-loading" />}>
      <AuthContent />
    </Suspense>
  );
}
