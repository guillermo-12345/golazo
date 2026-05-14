import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 900,
          letterSpacing: "-0.05em",
          borderRadius: "22%",
          position: "relative",
        }}
      >
        {/* Resplandor decorativo */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "30%",
            width: "60%",
            height: "60%",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />
        <div style={{ fontSize: 120, lineHeight: 1, zIndex: 1 }}>G</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            opacity: 0.85,
            letterSpacing: "0.15em",
            marginTop: 4,
            zIndex: 1,
          }}
        >
          GOLAZO
        </div>
      </div>
    ),
    { ...size }
  )
}
