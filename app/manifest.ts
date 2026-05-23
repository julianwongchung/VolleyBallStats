import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VolleyStats",
    short_name: "VolleyStats",
    description: "Mobile-first volleyball match and player statistics recorder.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f8",
    theme_color: "#087f7b",
    icons: [
      {
        src: "/brand/volleystats-logo.png",
        sizes: "1600x1600",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
