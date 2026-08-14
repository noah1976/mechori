import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MECHORI",
    short_name: "MECHORI",
    description: "愛車との時間と整備履歴を育てる車両ライフログ",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f3",
    theme_color: "#20262b",
    icons: [
      { src: "/mechori-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/mechori-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/mechori-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
