import { ImageResponse } from "next/og"

export const alt = "Golazo — Quiniela del Mundial 2026"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000000 0%, #052e16 50%, #000000 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          position: "relative",
        }}
      >
        {/* Resplandor verde difuso de fondo */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "30%",
            width: "40%",
            height: "60%",
            background: "rgba(34,197,94,0.18)",
            borderRadius: "50%",
            filter: "blur(120px)",
          }}
        />

        {/* Pelota emoji */}
        <div style={{ fontSize: 100, marginBottom: 20, zIndex: 1 }}>⚽</div>

        {/* GOLAZO con AZO verde */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            display: "flex",
            zIndex: 1,
          }}
        >
          <span style={{ color: "white" }}>GOL</span>
          <span style={{ color: "#22c55e" }}>AZO</span>
        </div>

        {/* Subtítulo */}
        <div
          style={{
            fontSize: 36,
            color: "#94a3b8",
            marginTop: 30,
            fontWeight: 500,
            zIndex: 1,
          }}
        >
          Quiniela del Mundial 2026
        </div>

        {/* Banderitas decorativas abajo */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            display: "flex",
            gap: 16,
            fontSize: 48,
            zIndex: 1,
          }}
        >
          <span>🇦🇷</span>
          <span>🇧🇷</span>
          <span>🇲🇽</span>
          <span>🇺🇸</span>
          <span>🇪🇸</span>
          <span>🇫🇷</span>
          <span>🇩🇪</span>
          <span>🇬🇧</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
