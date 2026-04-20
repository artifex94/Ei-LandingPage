import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Escobar Instalaciones — Seguridad y Monitoreo 24hs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1c1917 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Acento naranja superior */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "#f97316",
          }}
        />

        {/* Badge */}
        <div
          style={{
            background: "rgba(249,115,22,0.15)",
            border: "1px solid rgba(249,115,22,0.4)",
            borderRadius: "8px",
            padding: "8px 18px",
            color: "#fb923c",
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "32px",
          }}
        >
          Seguridad y Monitoreo 24hs
        </div>

        {/* Nombre de empresa */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.1,
            marginBottom: "24px",
          }}
        >
          Escobar
          <br />
          <span style={{ color: "#f97316" }}>Instalaciones</span>
        </div>

        {/* Descripción */}
        <div
          style={{
            fontSize: "26px",
            color: "#94a3b8",
            maxWidth: "720px",
            lineHeight: 1.5,
            marginBottom: "48px",
          }}
        >
          Alarmas · Cámaras CCTV · Domótica · Control de Acceso
        </div>

        {/* Footer con ubicación */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#64748b",
            fontSize: "20px",
          }}
        >
          <span style={{ color: "#f97316" }}>📍</span>
          Victoria, Entre Ríos, Argentina
          <span style={{ margin: "0 16px", color: "#334155" }}>|</span>
          instalacionescob.ar
        </div>
      </div>
    ),
    { ...size }
  );
}
