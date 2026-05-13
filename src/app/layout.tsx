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
  title: "Golazo — Quiniela del Mundial 2026",
  description: "Predecí los resultados del Mundial 2026, competí en ligas con tus amigos y demostrá que sos el más canchero.",
  keywords: ["mundial 2026", "quiniela", "fútbol", "predicciones", "prode"],
  openGraph: {
    title: "Golazo — Quiniela del Mundial 2026",
    description: "Predecí, competí y ganá. La quiniela del Mundial 2026.",
    type: "website",
  },
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
