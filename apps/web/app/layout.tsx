import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ApplicationFrame } from "@/components/application-frame";
import { mechoriProductionOrigin } from "@/lib/site-origin";
import { safeGtmBootstrap } from "@/lib/analytics-privacy";
import "./globals.css";

const remoteAlpha = process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha";
const googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-M54GKLLL";
const analyticsEnabled = process.env.NODE_ENV === "production" && /^GTM-[A-Z0-9]+$/.test(googleTagManagerId);
const siteUrl = process.env.NODE_ENV === "production"
  ? mechoriProductionOrigin
  : process.env.NEXT_PUBLIC_MECHORI_SITE_URL?.trim()
    || process.env.URL?.trim()
    || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: remoteAlpha ? "MECHORI Alpha" : "MECHORI Prototype",
  description: remoteAlpha
    ? "愛車との時間、整備履歴、実体験を記録して育てるMECHORI少人数α版"
    : "Local-only vehicle maintenance knowledge prototype",
  robots: remoteAlpha
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      }
    : undefined,
  icons: {
    icon: [
      { url: "/mechori-icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/mechori-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/mechori-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/mechori-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/mechori-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        {analyticsEnabled && (
          <>
            {/* Google Tag Manager */}
            <script
              dangerouslySetInnerHTML={{
                __html: safeGtmBootstrap(googleTagManagerId),
              }}
            />
            {/* End Google Tag Manager */}
          </>
        )}
      </head>
      <body>
        {/* No noscript GTM iframe: server cannot inspect invitation fragments. */}
        <ApplicationFrame>{children}</ApplicationFrame>
      </body>
    </html>
  );
}
