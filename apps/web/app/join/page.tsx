"use client";

import { useApp } from "@/lib/app-context";
import { buildInvitationAuthHref, isPlausibleInvitationToken } from "@/lib/invitation-link";
import { ArrowRight, CarFront, CircleAlert, LogIn, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function InviteLandingPage() {
  const { locale, signedIn } = useApp();
  const [error, setError] = useState("");
  const ja = locale === "ja";

  function continueWithInvitation(mode: "signin" | "signup") {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("invite")?.trim() ?? "";
    if (!isPlausibleInvitationToken(token)) {
      setError(ja ? "この招待URLを確認できませんでした。招待した方へ新しいURLをご確認ください。" : "This invitation link could not be verified. Please ask the inviter for a new link.");
      return;
    }
    window.location.assign(buildInvitationAuthHref(token, mode));
  }

  return (
    <main className="invite-landing" aria-labelledby="invite-landing-title">
      <section className="invite-landing-copy">
        <span className="eyebrow">INVITED TO MECHORI</span>
        <h1 id="invite-landing-title">{ja ? "愛車との時間を、記録して、つないで、残していく。" : "Record, connect, and keep the time you share with your vehicle."}</h1>
        <p>{ja
          ? "MECHORIに招待されています。クルマやバイクの整備、故障、部品交換、思い出を愛車の履歴として残し、人やクルマを通じて経験をつないでいくサービスです。"
          : "You are invited to MECHORI. Keep maintenance, repairs, parts, and memories in your vehicle history, then connect experience through people and vehicles."}
        </p>
        <div className="invite-landing-actions">
          {signedIn ? (
            <button type="button" className="primary-action" onClick={() => continueWithInvitation("signin")}>
              {ja ? "この招待を受ける" : "Accept this invitation"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="primary-action" onClick={() => continueWithInvitation("signup")}>
              {ja ? "招待を受けてMECHORIをはじめる" : "Accept the invitation and get started"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
          {!signedIn && (
            <button type="button" className="invite-landing-login" onClick={() => continueWithInvitation("signin")}>
              <LogIn size={18} aria-hidden="true" />{ja ? "すでにアカウントをお持ちですか？ ログイン" : "Already have an account? Sign in"}
            </button>
          )}
          {error && <p className="invite-landing-error" role="alert"><CircleAlert size={17} aria-hidden="true" />{error}</p>}
        </div>
      </section>
      <section className="invite-landing-values" aria-label={ja ? "MECHORIでできること" : "What you can do with MECHORI"}>
        <article><CarFront size={22} aria-hidden="true" /><h2>{ja ? "愛車の履歴を育てる" : "Grow your vehicle history"}</h2><p>{ja ? "整備も故障も思い出も、そのクルマやバイクの履歴として残せます。" : "Keep maintenance, setbacks, and memories with the vehicle they belong to."}</p></article>
        <article><UsersRound size={22} aria-hidden="true" /><h2>{ja ? "人とクルマでつながる" : "Connect through people and vehicles"}</h2><p>{ja ? "友人や気になるオーナー、特定のクルマをフォローできます。" : "Follow friends, owners you discover, and individual vehicles."}</p></article>
        <article><ArrowRight size={22} aria-hidden="true" /><h2>{ja ? "経験を残す" : "Leave experience behind"}</h2><p>{ja ? "あなたの記録が、いつか誰かのヒントになります。" : "Your record may help someone with a similar vehicle or question."}</p></article>
      </section>
      <Link href="/" className="invite-landing-home">{ja ? "MECHORIについて見る" : "Learn about MECHORI"}</Link>
    </main>
  );
}
