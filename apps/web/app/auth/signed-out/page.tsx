"use client";

import { CheckCircle2, LogIn } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";

export default function SignedOutPage() {
  const { locale } = useApp();
  const ja = locale === "ja";

  return (
    <div className="page-stack narrow-page signed-out-page">
      <CheckCircle2 size={40} aria-hidden="true" />
      <h1>{ja ? "ログアウトしました" : "You are signed out"}</h1>
      <p>
        {ja
          ? "保存済みの愛車や記録はそのまま残っています。"
          : "Your saved vehicles and records are still available."}
      </p>
      <div className="settings-actions">
        <Link href="/" className="secondary-action">{ja ? "公開ホームを見る" : "View public home"}</Link>
        <Link href="/auth" className="primary-action">
          <LogIn size={17} aria-hidden="true" />
          {ja ? "もう一度ログイン" : "Sign in again"}
        </Link>
      </div>
    </div>
  );
}
