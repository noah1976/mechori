"use client";

import { translate, uiLocaleOptions, type TranslationKey } from "@mechori/i18n";
import type { SupportedUiLocale } from "@mechori/core";
import {
  BookOpenText,
  CarFront,
  CircleAlert,
  House,
  Languages,
  LoaderCircle,
  LogIn,
  LogOut,
  Newspaper,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";

const navItems: Array<{
  href: string;
  label: TranslationKey;
  icon: typeof House;
}> = [
  { href: "/", label: "home", icon: House },
  { href: "/feed", label: "feed", icon: Newspaper },
  { href: "/garage", label: "garage", icon: CarFront },
  { href: "/records", label: "records", icon: BookOpenText },
  { href: "/search", label: "search", icon: Search },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    locale,
    setLocale,
    hydrated,
    signedIn,
    isRemoteAlpha,
    signOut,
    persistenceError,
    clearPersistenceError,
  } = useApp();
  const publicPath = isPublicPath(pathname);
  const authenticated = hydrated && signedIn;
  const visibleNavItems = authenticated
    ? navItems
    : navItems.filter((item) => item.href === "/" || item.href === "/search");

  useEffect(() => {
    if (hydrated && !signedIn && !publicPath) {
      router.replace(`/auth?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, pathname, publicPath, router, signedIn]);

  async function logOut() {
    try {
      await signOut();
      router.replace("/");
    } catch {
      // The shared persistence banner reports the sign-out failure.
    }
  }

  return (
    <div className="app-frame">
      <aside className="side-nav" aria-label="Primary navigation">
        <Link href="/" className="brand-block" aria-label="MECHORI home">
          <span className="brand-mark">M</span>
          <span>
            <strong>MECHORI</strong>
            <small>{translate(locale, "tagline")}</small>
          </span>
        </Link>
        <nav>
          {visibleNavItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={20} aria-hidden="true" />
                <span>{translate(locale, item.label)}</span>
              </Link>
            );
          })}
        </nav>
        {authenticated ? (
          <Link href="/records/new" className="primary-action nav-add">
            <Plus size={18} aria-hidden="true" />
            {translate(locale, "addRecord")}
          </Link>
        ) : (
          <Link href="/auth" className="primary-action nav-add">
            <LogIn size={18} aria-hidden="true" />
            {locale === "ja" ? "ログイン" : "Sign in"}
          </Link>
        )}
      </aside>

      <div className="content-column">
        <header className="top-bar">
          <Link href="/" className="mobile-brand">MECHORI</Link>
          <div className="top-bar-actions">
            <label className="locale-select">
              <Languages size={18} aria-hidden="true" />
              <span className="sr-only">{locale === "ja" ? "表示言語" : "Display language"}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as SupportedUiLocale)}
                aria-label={locale === "ja" ? "表示言語" : "Display language"}
              >
                {uiLocaleOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {authenticated ? (
              <>
                <Link href="/settings/privacy" className="icon-text-button" aria-label={locale === "ja" ? "表示と安全" : "Privacy & safety"} title={locale === "ja" ? "表示と安全" : "Privacy & safety"}>
                  <Settings2 size={18} aria-hidden="true" />
                  <span className="top-bar-action-label">{locale === "ja" ? "表示と安全" : "Privacy & safety"}</span>
                </Link>
                <button className="icon-text-button" type="button" onClick={logOut} aria-label={locale === "ja" ? "ログアウト" : "Sign out"} title={locale === "ja" ? "ログアウト" : "Sign out"}>
                  <LogOut size={18} aria-hidden="true" />
                  <span className="top-bar-action-label">{locale === "ja" ? "ログアウト" : "Sign out"}</span>
                </button>
              </>
            ) : pathname !== "/auth" ? (
              <Link href="/auth" className="icon-text-button" aria-label={locale === "ja" ? "ログイン" : "Sign in"} title={locale === "ja" ? "ログイン" : "Sign in"}>
                <LogIn size={18} aria-hidden="true" />
                <span className="top-bar-action-label">{locale === "ja" ? "ログイン" : "Sign in"}</span>
              </Link>
            ) : null}
          </div>
        </header>
        {persistenceError && (
          <div className="persistence-error" role="alert">
            <CircleAlert size={19} aria-hidden="true" />
            <span>
              {isRemoteAlpha
                ? locale === "ja"
                  ? "MECHORIへ保存できませんでした。通信状態を確認して、もう一度お試しください。"
                  : "Changes could not be saved to MECHORI. Check your connection and try again."
                : locale === "ja"
                  ? "端末へ保存できませんでした。空き容量やブラウザの保存設定を確認してください。"
                  : "Changes could not be saved on this device. Check available storage and browser settings."}
            </span>
            <button
              type="button"
              className="icon-action"
              onClick={clearPersistenceError}
              aria-label={locale === "ja" ? "保存エラーを閉じる" : "Dismiss storage error"}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        <main>
          {hydrated && (signedIn || publicPath) ? children : (
            <div className="app-loading" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={24} aria-hidden="true" />
              <span>
                {!hydrated
                  ? isRemoteAlpha
                    ? locale === "ja" ? "Garageを読み込み中" : "Loading your Garage"
                    : locale === "ja" ? "端末内のデータを確認中" : "Loading data from this device"
                  : locale === "ja" ? "ログイン画面へ移動中" : "Opening sign in"}
              </span>
            </div>
          )}
        </main>
      </div>

      <nav className={authenticated ? "bottom-nav" : "bottom-nav signed-out"} aria-label="Mobile navigation">
        {visibleNavItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <Icon size={20} aria-hidden="true" />
              <span>{translate(locale, item.label)}</span>
            </Link>
          );
        })}
        {!authenticated && (
          <Link href="/auth" className={pathname === "/auth" ? "active" : ""}>
            <LogIn size={20} aria-hidden="true" />
            <span>{locale === "ja" ? "ログイン" : "Sign in"}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/search" ||
    pathname === "/auth" ||
    pathname.startsWith("/v/") ||
    pathname.startsWith("/profile/") ||
    (pathname.startsWith("/journal/") &&
      pathname !== "/journal/new" &&
      !pathname.endsWith("/report"))
  );
}
