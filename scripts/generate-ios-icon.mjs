import sharp from "sharp";

// Same wing mark + background color as the Android launcher icon
// (android/app/src/main/res/values/ic_launcher_background.xml: #fbf4e6)
// and the Play Store feature graphic (scripts/generate-feature-graphic.mjs).
const SIZE = 1024;

const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f5dd4b"/>
      <stop offset="1" stop-color="#ff6b47"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#fbf4e6"/>
  <g transform="translate(192, 300)">
    <path d="M8 460 L320 90 L632 460" stroke="url(#wing)" stroke-width="62" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="320" cy="90" r="62" fill="#d4541a"/>
    <circle cx="180" cy="270" r="38" fill="#1a1814"/>
    <circle cx="460" cy="270" r="38" fill="#1a1814"/>
  </g>
</svg>`;

// App Store icons must have no alpha channel.
await sharp(Buffer.from(svg))
  .flatten({ background: "#fbf4e6" })
  .png()
  .toFile("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

console.log("Wrote ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024x1024)");
