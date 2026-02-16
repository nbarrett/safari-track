import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT = join(import.meta.dirname, "..", "public", "splash");

// iOS device splash screen sizes (width x height at device pixel ratio)
const SCREENS = [
  // iPhone 15 Pro Max, 16 Plus, 16 Pro Max
  { w: 1290, h: 2796, name: "iphone-1290x2796" },
  // iPhone 15 Pro, 16, 16 Pro
  { w: 1179, h: 2556, name: "iphone-1179x2556" },
  // iPhone 14, 15, SE 4th gen
  { w: 1170, h: 2532, name: "iphone-1170x2532" },
  // iPhone 14 Plus
  { w: 1284, h: 2778, name: "iphone-1284x2778" },
  // iPhone 13 mini, 12 mini
  { w: 1080, h: 2340, name: "iphone-1080x2340" },
  // iPhone SE 3rd gen, 8, 7, 6s
  { w: 750, h: 1334, name: "iphone-750x1334" },
  // iPad Pro 12.9"
  { w: 2048, h: 2732, name: "ipad-2048x2732" },
  // iPad Pro 11"
  { w: 1668, h: 2388, name: "ipad-1668x2388" },
  // iPad Air, iPad 10th gen
  { w: 1640, h: 2360, name: "ipad-1640x2360" },
  // iPad mini 6th gen
  { w: 1488, h: 2266, name: "ipad-1488x2266" },
];

const BG = "#EDE4D9";
const TEXT_COLOUR = "#6B4C2E";

async function generateSplash(w: number, h: number, name: string) {
  // Load and resize the icon
  const iconSize = Math.round(Math.min(w, h) * 0.2);
  const icon = await sharp(join(import.meta.dirname, "..", "public", "icon-512.png"))
    .resize(iconSize, iconSize)
    .toBuffer();

  const iconLeft = Math.round((w - iconSize) / 2);
  const iconTop = Math.round(h * 0.35 - iconSize / 2);

  const textY = iconTop + iconSize + Math.round(h * 0.04);
  const fontSize = Math.round(Math.min(w, h) * 0.045);

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${BG}"/>
    <text x="${w / 2}" y="${textY}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="600" fill="${TEXT_COLOUR}" letter-spacing="0.5">Safari Track</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .composite([{ input: icon, left: iconLeft, top: iconTop }])
    .png()
    .toFile(join(OUT, `${name}.png`));

  console.log(`  ${name}.png (${w}x${h})`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("Generating splash screens...");
  for (const s of SCREENS) {
    await generateSplash(s.w, s.h, s.name);
  }
  console.log("Done.");
}

main().catch(console.error);
