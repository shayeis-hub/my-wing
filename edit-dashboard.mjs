import sharp from 'sharp';

const inputPath = 'C:\\Users\\shay\\Downloads\\דשבורד.jpeg';
const outputPath = 'C:\\Users\\shay\\Downloads\\דשבורד-ערוך.jpeg';

const meta = await sharp(inputPath).metadata();
const w = meta.width;
const h = meta.height;
console.log(`Image: ${w}x${h}`);

// Based on the screenshot layout, approximate positions for the 3 mini-stat boxes
// The boxes are in the bottom of the hero card (gradient area)
// Steps (צעדים) - rightmost box (RTL), Water (מים) - middle, Streak (סטריק) - leftmost

// We'll overlay white rectangles to cover the "—" and then write new values
// Coordinates are approximate based on the screenshot proportions

const scaleX = w / 780;  // approximate reference width
const scaleY = h / 1688; // approximate reference height

// The three stat boxes are at approximately y=68-72% of the card
// Card starts at ~31% and ends at ~50% of image height

// Let's define the overlay SVG
// From the image: the mini-stats are at roughly y=590-660 (in a 1688 tall image)
// Box centers approximately at x=650, x=390, x=130 (RTL: steps right, water middle, streak left)

// The 3 mini-stat boxes are at ~69-73% height, the "—" is inside each box
// Box centers Y: ~71.5% = 1464
// Box X centers (RTL): steps ~83%, water ~50%, streak ~17%
const boxY = Math.round(h * 0.463);
const boxH = Math.round(h * 0.045);
const boxW = Math.round(w * 0.21);
const fontSize = Math.round(w * 0.058);

const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Steps (right box in RTL) -->
  <rect x="${Math.round(w*0.725)}" y="${boxY - boxH/2}" width="${boxW}" height="${boxH}" fill="#fbefd8" rx="3"/>
  <text x="${Math.round(w*0.83)}" y="${boxY}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}"
    fill="#1a1814" text-anchor="middle" dominant-baseline="middle">6.3k</text>

  <!-- Water (middle box) -->
  <rect x="${Math.round(w*0.39)}" y="${boxY - boxH/2}" width="${boxW}" height="${boxH}" fill="#fbefd8" rx="3"/>
  <text x="${Math.round(w*0.495)}" y="${boxY}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}"
    fill="#1a1814" text-anchor="middle" dominant-baseline="middle">1.5L</text>

  <!-- Streak (left box in RTL) -->
  <rect x="${Math.round(w*0.055)}" y="${boxY - boxH/2}" width="${boxW}" height="${boxH}" fill="#fbefd8" rx="3"/>
  <text x="${Math.round(w*0.16)}" y="${boxY}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}"
    fill="#d4541a" text-anchor="middle" dominant-baseline="middle">5</text>
</svg>`;

console.log('Applying overlay...');
await sharp(inputPath)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 95 })
  .toFile(outputPath);

console.log('Saved to:', outputPath);
