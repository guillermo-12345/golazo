import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Golazo — Quiniela del Mundial 2026",
    short_name: "Golazo",
    description: "Predecí los resultados del Mundial 2026, competí en ligas con tus amigos y demostrá que sos el más canchero.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#16a34a",
    orientation: "portrait",
    categories: ["sports", "games", "entertainment"],
    lang: "es",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
