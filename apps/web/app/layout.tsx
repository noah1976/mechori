import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AppProvider } from "@/lib/app-context";
import "./globals.css";

const remoteAlpha = process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha";
const googleTagManagerId = "GTM-M54GKLLL";
const analyticsEnabled = process.env.NODE_ENV === "production";

export const metadata: Metadata = {
  title: remoteAlpha ? "MECHORI Alpha" : "MECHORI Prototype",
  description: remoteAlpha
    ? "愛車と整備履歴を非公開で記録するMECHORI少人数α版"
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
