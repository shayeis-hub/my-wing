import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const svgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background rounded square -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#0ea5e9"/>

  <!-- Wing shape (stylized) -->
  <g transform="translate(${size * 0.5}, ${size * 0.52})">
    <!-- Left wing -->
    <path
      d="M0,0 C${-size*0.05},${-size*0.12} ${-size*0.22},${-size*0.18} ${-size*0.32},${-size*0.08}
         C${-size*0.38},${-size*0.02} ${-size*0.35},${size*0.08} ${-size*0.22},${size*0.1}
         C${-size*0.12},${size*0.12} ${-size*0.04},${size*0.06} 0,0 Z"
      fill="white" opacity="0.95"
    />
    <!-- Right wing -->
    <path
      d="M0,0 C${size*0.05},${-size*0.12} ${size*0.22},${-size*0.18} ${size*0.32},${-size*0.08}
         C${size*0.38},${-size*0.02} ${size*0.35},${size*0.08} ${size*0.22},${size*0.1}
         C${size*0.12},${size*0.12} ${size*0.04},${size*0.06} 0,0 Z"
      fill="white" opacity="0.95"
    />
    <!-- Body / center -->
    <ellipse cx="0" cy="${size*0.04}" rx="${size*0.06}" ry="${size*0.1}" fill="white"/>
    <!-- Tail -->
    <path
      d="M${-size*0.04},${size*0.1} Q0,${size*0.2} ${size*0.04},${size*0.1}"
      stroke="white" stroke-width="${size*0.025}" fill="none" stroke-linecap="round"
    />
  </g>

  <!-- "MW" subtle text at bottom -->
  <text
    x="${size*0.5}" y="${size*0.91}"
    font-family="system-ui, sans-serif"
    font-size="${size*0.1}"
    font-weight="700"
    fill="white"
    opacity="0.7"
    text-anchor="middle"
    letter-spacing="${size*0.008}"
  >MY WING</text>
</svg>
`;

async function generate() {
  const dir = "./public/icons";
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  for (const size of [192, 512]) {
    await sharp(Buffer.from(svgIcon(size)))
      .png()
      .toFile(`${dir}/icon-${size}.png`);
    console.log(`✓ icon-${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(Buffer.from(svgIcon(180)))
    .png()
    .toFile("./public/apple-touch-icon.png");
  console.log("✓ apple-touch-icon.png");

  // Favicon 32x32
  await sharp(Buffer.from(svgIcon(32)))
    .png()
    .toFile("./public/favicon-32.png");
  console.log("✓ favicon-32.png");

  console.log("\nDone! Icons generated in public/icons/");
}

generate().catch(console.error);
