import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seven Empty Circles — Printable Map",
  description:
    "Download the free printable map from Seven Empty Circles by Shay Eisenberg. Print it every morning and color a circle for each habit you discover.",
};

export default function MapPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#F7F1E3 0%,#EDE3C8 60%,#E0D0A8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#3D2E18",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: "rgba(250,244,228,0.88)",
          border: "1.5px solid #C8A86E",
          borderRadius: 16,
          padding: "52px 48px",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 32px rgba(61,46,24,0.10)",
        }}
      >
        {/* Compass */}
        <CompassIcon />

        {/* Eyebrow */}
        <p
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#8A7050",
            margin: "20px 0 10px",
          }}
        >
          Seven Empty Circles
        </p>

        {/* Headline */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.25,
            marginBottom: 10,
            letterSpacing: "-0.01em",
          }}
        >
          Turn On Your Map Today
        </h1>

        {/* Sub */}
        <p
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 15,
            lineHeight: 1.7,
            color: "#5C4B33",
            marginBottom: 36,
            maxWidth: 360,
            margin: "0 auto 36px",
          }}
        >
          Print this map every morning. Color a circle for each habit you
          discover. It goes gray again tomorrow — and turning it back on is the
          whole idea.
        </p>

        {/* Download button */}
        <a
          href="/map.pdf"
          download="seven-empty-circles-map.pdf"
          style={{
            display: "inline-block",
            background: "#3D2E18",
            color: "#F5EDD8",
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "16px 40px",
            borderRadius: 8,
            textDecoration: "none",
            marginBottom: 14,
          }}
        >
          Download &amp; Print
        </a>

        {/* Hint */}
        <p
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 11,
            color: "#8A7050",
            letterSpacing: "0.05em",
          }}
        >
          Free &middot; PDF &middot; A4 or Letter
        </p>
      </div>

      {/* Footer */}
      <p
        style={{
          fontFamily: "'Trebuchet MS', sans-serif",
          fontSize: 11,
          color: "#8A7050",
          marginTop: 36,
          letterSpacing: "0.04em",
        }}
      >
        From the picture book by{" "}
        <span style={{ color: "#5C4B33", fontWeight: 600 }}>Shay Eisenberg</span>
      </p>
    </main>
  );
}

function CompassIcon() {
  return (
    <svg
      viewBox="0 0 100 100"
      width={72}
      height={72}
      style={{ opacity: 0.75 }}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="#9C875F" strokeWidth="2" />
      <circle cx="50" cy="50" r="4" fill="#9C875F" />
      {/* N */}
      <polygon points="50,8 44,50 50,40 56,50" fill="#C8881C" />
      {/* S */}
      <polygon points="50,92 44,50 50,60 56,50" fill="#9C875F" opacity="0.5" />
      {/* E/W ticks */}
      <line x1="92" y1="50" x2="84" y2="50" stroke="#9C875F" strokeWidth="1.5" />
      <line x1="8" y1="50" x2="16" y2="50" stroke="#9C875F" strokeWidth="1.5" />
      <text x="50" y="20" textAnchor="middle" fontSize="9" fill="#8A7050"
            fontFamily="'Trebuchet MS',sans-serif" fontWeight="700" letterSpacing="1">N</text>
    </svg>
  );
}
