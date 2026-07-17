import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AppProvider } from "@/lib/app-context";
import "./globals.css";

const remoteAlpha = process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha";

export const metadata: Metadata = {
  title: remoteAlpha ? "MECHORI Alpha" : "MECHORI Prototype",
  description: remoteAlpha
    ? "愛車と整備履歴を非公開で記録するMECHORI少人数α版"
    : "Local-only vehicle maintenance knowledge prototype",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
