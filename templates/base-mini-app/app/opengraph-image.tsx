import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 800 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#101413",
          color: "#f5f7f2",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700 }}>USDCtoFiat</div>
          <div
            style={{
              border: "1px solid #85d985",
              color: "#85d985",
              borderRadius: 999,
              padding: "14px 22px",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            Base
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              color: "#85d985",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Self-serve cash-out
          </div>
          <div
            style={{
              maxWidth: 840,
              fontSize: 76,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            Sell Base USDC into payment-app money
          </div>
        </div>

        <div style={{ color: "#b8c4ba", fontSize: 28 }}>
          Venmo, Cash App, Wise, Revolut, PayPal, Zelle, Monzo, and Chime
        </div>
      </div>
    ),
    size,
  );
}
