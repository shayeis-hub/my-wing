import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// Wing drawn as SVG paths in a 100x100 grid, scaled by `s`
const svgIcon = (size) => {
  const r = size * 0.22; // corner radius
  const s = size / 100;  // scale

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" fill="#f0f9ff"/>

  <!-- Wing (single right-facing angel wing) -->
  <g transform="scale(${s})">

    <!-- Shadow layer -->
    <path d="
      M 50 78
      C 46 68, 28 52, 22 28
      C 30 14, 52 10, 68 18
      C 80 14, 88 22, 87 36
      C 82 30, 74 30, 70 38
      C 80 32, 86 42, 84 54
      C 77 47, 68 48, 66 58
      C 73 53, 78 61, 74 70
      C 64 66, 56 68, 52 74
      Z
    " fill="#c8dff0" />

    <!-- Main wing body -->
    <path d="
      M 48 76
      C 44 66, 26 50, 20 26
      C 28 12, 50 8, 66 16
      C 78 12, 86 20, 85 34
      C 80 28, 72 28, 68 36
      C 78 30, 84 40, 82 52
      C 75 45, 66 46, 64 56
      C 71 51, 76 59, 72 68
      C 62 64, 54 66, 50 72
      Z
    " fill="white" />

    <!-- Feather division lines from quill outward -->
    <path d="M48,76 C52,60 60,40 66,16" stroke="#c8dff0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M48,76 C56,60 68,42 82,30" stroke="#c8dff0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M48,76 C58,64 72,56 82,52" stroke="#c8dff0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M48,76 C58,70 68,66 72,68" stroke="#c8dff0" stroke-width="1.2" fill="none" stroke-linecap="round"/>

    <!-- Quill -->
    <ellipse cx="48" cy="78" rx="2.5" ry="4" fill="#a0bcd4" transform="rotate(-15, 48, 78)"/>
  </g>

  <!-- App name -->
  <text
    x="${size * 0.5}"
    y="${size * 0.915}"
    font-size="${size * 0.1}"
    font-weight="700"
    font-family="system-ui, -apple-system, Arial, sans-serif"
    fill="#1e3a5f"
    text-anchor="middle"
  >MY WING</text>
</svg>`;
};

async function generate() {
  const dir = "./public/icons";
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  for (const size of [192, 512]) {
    await sharp(Buffer.from(svgIcon(size)))
      .png()
      .toFile(`${dir}/icon-${size}.png`);
    console.log(`✓ icon-${size}.png`);
  }

  await sharp(Buffer.from(svgIcon(180)))
    .png()
    .toFile("./public/apple-touch-icon.png");
  console.log("✓ apple-touch-icon.png");

  await sharp(Buffer.from(svgIcon(32)))
    .png()
    .toFile("./public/favicon-32.png");
  console.log("✓ favicon-32.png");

  console.log("\nDone!");
}

generate().catch(console.error);
