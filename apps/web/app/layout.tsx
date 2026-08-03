import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AppProvider } from "@/lib/app-context";
import "./globals.css";

/* eslint-disable @next/next/next-script-for-ga -- MECHORI uses the owner-supplied GTM container snippet verbatim. */

const remoteAlpha = process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha";
const googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-M54GKLLL";
const analyticsEnabled = process.env.NODE_ENV === "production" && /^GTM-[A-Z0-9]+$/.test(googleTagManagerId);
const siteUrl = process.env.NEXT_PUBLIC_MECHORI_SITE_URL?.trim()
  || process.env.URL?.trim()
  || (process.env.NODE_ENV === "production" ? "https://mechori.com" : "http://localhost:3000");

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
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${googleTagManagerId}');`,
              }}
            />
            {/* End Google Tag Manager */}
          </>
        )}
      </head>
      <body>
        {analyticsEnabled && (
          <>
            {/* Google Tag Manager (noscript) */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
            {/* End Google Tag Manager (noscript) */}
          </>
        )}
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
