import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const W = 1024;
const H = 500;

function svg({ tagline }) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f5dd4b"/>
      <stop offset="1" stop-color="#ff6b47"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0" stop-color="#f5dd4b" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#f5dd4b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.1" cy="0.9" r="0.55">
      <stop offset="0" stop-color="#ff6b47" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#ff6b47" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#fbf4e6"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>

  <!-- Wing mark -->
  <g transform="translate(120, 165)">
    <path d="M4 128 L120 26 L236 128" stroke="url(#wing)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="120" cy="26" r="18" fill="#d4541a"/>
    <circle cx="68" cy="76" r="11" fill="#1a1814"/>
    <circle cx="172" cy="76" r="11" fill="#1a1814"/>
  </g>

  <!-- Wordmark + tagline -->
  <text x="420" y="245" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="88" letter-spacing="-3" fill="#1a1814">Wingpact</text>
  <text x="422" y="300" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="34" fill="#3a3329">${tagline}</text>
</svg>`;
}

async function main() {
  if (!existsSync("public/screenshots")) await mkdir("public/screenshots", { recursive: true });

  // Play Console requires a 24-bit PNG with no alpha channel — flatten against
  // the graphic's own background color.
  await sharp(Buffer.from(svg({ tagline: "Lose weight together" })))
    .flatten({ background: "#fbf4e6" })
    .png()
    .toFile("public/screenshots/feature-graphic.png");
  console.log("Wrote public/screenshots/feature-graphic.png (1024x500)");

  await sharp(Buffer.from(svg({ tagline: "יורדים במשקל ביחד" })))
    .flatten({ background: "#fbf4e6" })
    .png()
    .toFile("public/screenshots/feature-graphic-he.png");
  console.log("Wrote public/screenshots/feature-graphic-he.png (1024x500)");
}

main();
