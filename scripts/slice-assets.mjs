import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/concepts/game-interface-v2.png');
const out = path.join(root, 'web/public/art');
await mkdir(out, { recursive: true });

// Rectangles refer to the original 1672 × 941 v2 image. Labels and HUD are
// rebuilt in HTML rather than baked into these reusable art crops.
const regions = {
  'room-watch': [0, 77, 1375, 620],
  'portrait-player': [31, 5, 80, 77],
  'portrait-keeper': [23, 707, 182, 193],
  'item-key': [1417, 181, 91, 127],
  'item-candle': [1428, 378, 81, 124],
  'item-beads': [1539, 377, 95, 124],
  'ledger': [466, 576, 373, 91],
};
for (const [name, [left, top, width, height]] of Object.entries(regions)) {
  await sharp(source).extract({ left, top, width, height }).webp({ quality: 95 }).toFile(path.join(out, `${name}.webp`));
}
await writeFile(path.join(out, 'slices.json'), JSON.stringify({ source: 'assets/concepts/game-interface-v2.png', size: [1672, 941], regions }, null, 2) + '\n');
console.log(`已从 v2 概念图切出 ${Object.keys(regions).length} 张素材：web/public/art/`);
