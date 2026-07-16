"use client";

import { translate, type TranslationKey } from "@mechori/i18n";
import {
  BookOpenText,
  CarFront,
  House,
  Languages,
  Newspaper,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
  const { locale, setLocale } = useApp();

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
          {navItems.map((item) => {
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
        <Link href="/records/new" className="primary-action nav-add">
          <Plus size={18} aria-hidden="true" />
          {translate(locale, "addRecord")}
        </Link>
      </aside>

      <div className="content-column">
        <header className="top-bar">
          <Link href="/" className="mobile-brand">MECHORI</Link>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
            aria-label={locale === "ja" ? "Switch to English" : "日本語に切り替え"}
          >
            <Languages size={18} aria-hidden="true" />
            {locale === "ja" ? "EN" : "日本語"}
          </button>
        </header>
        <main>{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
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
    </div>
  );
}
