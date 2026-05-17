import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const src = "C:/Users/shay/Downloads/my-wing-icon.png";

async function generate() {
  const dir = "./public/icons";
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  // Remove the black border — crop to the rounded square content
  const img = sharp(src);

  for (const size of [192, 512]) {
    await img.clone().resize(size, size).png().toFile(`${dir}/icon-${size}.png`);
    console.log(`✓ icon-${size}.png`);
  }

  await img.clone().resize(180, 180).png().toFile("./public/apple-touch-icon.png");
  console.log("✓ apple-touch-icon.png");

  await img.clone().resize(32, 32).png().toFile("./public/favicon-32.png");
  console.log("✓ favicon-32.png");

  console.log("\nDone!");
}

generate().catch(console.error);
