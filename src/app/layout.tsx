import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Golazo — Quiniela del Mundial 2026",
    template: "%s · Golazo",
  },
  description:
    "Predecí los resultados del Mundial 2026, competí en ligas privadas o públicas con tus amigos y descubrí quién sabe más de fútbol.",
  keywords: ["mundial 2026", "quiniela", "fútbol", "predicciones", "prode", "world cup", "FIFA 2026"],
  applicationName: "Golazo",
  authors: [{ name: "Guillermo Ibañez" }],
  creator: "Guillermo Ibañez",
  openGraph: {
    title: "Golazo — Quiniela del Mundial 2026",
    description: "Predecí, competí y ganá. La quiniela más adictiva del Mundial 2026.",
    type: "website",
    locale: "es_AR",
    siteName: "Golazo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Golazo — Quiniela del Mundial 2026",
    description: "Predecí, competí y ganá. La quiniela más adictiva del Mundial 2026.",
  },
}

export const viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
