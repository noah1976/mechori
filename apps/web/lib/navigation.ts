import type { SupportedUiLocale } from "@mechori/core";
import { Bell, CarFront, House, Search } from "lucide-react";

export const appNavigationItems = [
  { href: "/", label: "home", icon: House },
  { href: "/search", label: "search", icon: Search },
  { href: "/notifications", label: "notifications", icon: Bell },
  { href: "/garage", label: "garage", icon: CarFront },
] as const;

export type AuthDisplayState = "loading" | "authenticated" | "signed-out";

export function authDisplayState(hydrated: boolean, signedIn: boolean): AuthDisplayState {
  if (!hydrated) return "loading";
  return signedIn ? "authenticated" : "signed-out";
}

export function navigationLabel(label: (typeof appNavigationItems)[number]["label"], locale: SupportedUiLocale) {
  if (locale === "ja") {
    return { home: "ホーム", search: "探す", notifications: "通知", garage: "ガレージ" }[label];
  }
  return { home: "Home", search: "Search", notifications: "Notifications", garage: "Garage" }[label];
}

export function isActiveNavigation(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/feed" || pathname.startsWith("/journal/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function screenTitle(pathname: string, locale: SupportedUiLocale) {
  if (locale !== "ja") {
    if (pathname === "/") return "MECHORI";
    if (pathname.startsWith("/search") || pathname.startsWith("/people")) return "Search";
    if (pathname.startsWith("/notifications")) return "Notifications";
    if (pathname.startsWith("/garage") || pathname.startsWith("/profile") || pathname.startsWith("/v/")) return "Garage";
    if (pathname.startsWith("/journal") || pathname.startsWith("/records")) return "Record";
    return "MECHORI";
  }
  if (pathname === "/") return "MECHORI";
  if (pathname.startsWith("/search") || pathname.startsWith("/people")) return "探す";
  if (pathname.startsWith("/notifications")) return "通知";
  if (pathname.startsWith("/garage") || pathname.startsWith("/profile") || pathname.startsWith("/v/")) return "ガレージ";
  if (pathname.startsWith("/journal") || pathname.startsWith("/records")) return "記録";
  if (pathname.startsWith("/settings")) return "設定";
  return "MECHORI";
}

export function shouldShowRecordFab(pathname: string) {
  return !(
    pathname === "/journal/new" ||
    (pathname.startsWith("/journal/") && pathname.endsWith("/edit")) ||
    (pathname.startsWith("/garage/") && pathname.endsWith("/event/new")) ||
    pathname.startsWith("/records/")
  );
}
