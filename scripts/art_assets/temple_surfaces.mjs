import { readFile, writeFile, unlink } from 'node:fs/promises';
import sharp from 'sharp';

const root = 'web/public/art/world/';
const width = 512;
const ids = ['temple_paint', 'temple_relief'];

// The reference albedo contains pigment and leaf. Derive restrained surface
// detail from local contrast; these are approximate maps, not scanned PBR data.
for (const [index, id] of ids.entries()) {
  const input = `tmp/imagecreate/${id}.png`;
  const rgb = await sharp(input)
    .resize(width, width, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const height = await sharp(input)
    .resize(width, width, { fit: 'fill' })
    .grayscale()
    .blur(1.1)
    .raw()
    .toBuffer();
  const normal = Buffer.alloc(width * width * 3);
  const arm = Buffer.alloc(width * width * 3);
  const at = (x, y) =>
    height[Math.max(0, Math.min(width - 1, y)) * width + Math.max(0, Math.min(width - 1, x))] / 255;
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 3;
      const dx = (at(x - 1, y) - at(x + 1, y)) * 2.3;
      const dy = (at(x, y - 1) - at(x, y + 1)) * 2.3;
      const length = Math.hypot(dx, dy, 1);
      normal[p] = Math.round(((dx / length) * 0.5 + 0.5) * 255);
      normal[p + 1] = Math.round(((dy / length) * 0.5 + 0.5) * 255);
      normal[p + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      const gilded = rgb[p] > rgb[p + 2] * 1.35 && rgb[p + 1] > rgb[p + 2] * 1.18;
      arm[p] = Math.round(205 + at(x, y) * 50);
      arm[p + 1] = gilded ? 190 : 245;
      arm[p + 2] = gilded ? 210 : 20;
    }
  await sharp(rgb, { raw: { width, height: width, channels: 3 } })
    .webp({ quality: 96 })
    .toFile(root + id + '_albedo.webp');
  await sharp(normal, { raw: { width, height: width, channels: 3 } })
    .webp({ lossless: true })
    .toFile(root + id + '_normal.webp');
  await sharp(arm, { raw: { width, height: width, channels: 3 } })
    .webp({ lossless: true })
    .toFile(root + id + '_arm.webp');
  // Reload before each write so additions by the parallel sculpture workflow
  // stay intact. Existing packed material indices must never be shifted.
  const manifest = JSON.parse(await readFile(root + 'library.json', 'utf8'));
  const slot = 18 + index;
  if (manifest.surfaces[slot] && manifest.surfaces[slot].id !== id)
    throw new Error(
      `Reserved temple surface ${slot} already belongs to ${manifest.surfaces[slot].id}`,
    );
  if (manifest.surfaces.length < slot)
    throw new Error('Temple material slots must append in order');
  manifest.surfaces[slot] = {
    id,
    albedo: id + '_albedo.webp',
    normal: id + '_normal.webp',
    arm: id + '_arm.webp',
  };
  await writeFile(root + 'library.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: registered local surface ${slot}, pattern ${slot + 16}`);
}

// Retain only the current runtime material and the reproducible prompt spec.
for (const id of ids) {
  await unlink(`tmp/imagecreate/${id}.png`);
  await unlink(`tmp/imagecreate/${id}.txt`).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
