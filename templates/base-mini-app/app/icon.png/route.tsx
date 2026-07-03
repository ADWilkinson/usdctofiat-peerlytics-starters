import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 200, height: 200 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#101413",
          color: "#85d985",
          fontSize: 74,
          fontWeight: 800,
          letterSpacing: 0,
        }}
      >
        $
      </div>
    ),
    size,
  );
}
