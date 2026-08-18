import sharp from "sharp";

// Matches capacitor.config.ts SplashScreen.backgroundColor (#fbf4e6) and the
// same wing mark used by the app icon / feature graphic. The storyboard shows
// this at contentMode="scaleAspectFill", so the background must be baked in.
const SIZE = 2732;

const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f5dd4b"/>
      <stop offset="1" stop-color="#ff6b47"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#fbf4e6"/>
  <g transform="translate(1166, 1266)">
    <path d="M8 460 L320 90 L632 460" stroke="url(#wing)" stroke-width="62" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="320" cy="90" r="62" fill="#d4541a"/>
    <circle cx="180" cy="270" r="38" fill="#1a1814"/>
    <circle cx="460" cy="270" r="38" fill="#1a1814"/>
  </g>
</svg>`;

const buf = await sharp(Buffer.from(svg)).flatten({ background: "#fbf4e6" }).png().toBuffer();

const dir = "ios/App/App/Assets.xcassets/Splash.imageset";
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await sharp(buf).toFile(`${dir}/${name}`);
  console.log(`Wrote ${dir}/${name}`);
}
