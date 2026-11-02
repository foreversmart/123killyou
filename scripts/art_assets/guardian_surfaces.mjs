import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Usage: node scripts/art_assets/guardian_surfaces.mjs [approved-atlas.png]
// Input quadrants: gilding / cloud relief / lamellar plates / neutral pigment.
// These maps are artistic approximations, not measured PBR or recovered depth.
const project = fileURLToPath(new URL('../../', import.meta.url));
const input = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(project, 'assets/environment/guardian_surfaces/atlas.png');
const output = path.join(project, 'web/public/art/world');
const manifestPath = path.join(output, 'library.json');
const size = 512;
const definitions = [
  { id: 'guardian_gilding', rough: 0.76, metal: 0.72, strength: 0.7 },
  { id: 'guardian_clouds', rough: 0.8, metal: 0.62, strength: 1.05 },
  { id: 'guardian_lamellar', rough: 0.82, metal: 0.65, strength: 0.85 },
  { id: 'guardian_pigment', rough: 0.96, metal: 0, strength: 0.4 },
];
const entry = (id) => ({
  id,
  albedo: `${id}_albedo.webp`,
  normal: `${id}_normal.webp`,
  arm: `${id}_arm.webp`,
});

function validateSlots(manifest) {
  if (!Array.isArray(manifest.surfaces)) throw new Error('Library has no surface list.');
  for (const [index, id] of ['temple_paint', 'temple_relief'].entries())
    if (manifest.surfaces[23 + index]?.id !== id)
      throw new Error(`Expected ${id} at slot ${23 + index}; no library entries were changed.`);
  for (const [index, { id }] of definitions.entries()) {
    const slot = index + 25;
    const current = manifest.surfaces[slot];
    if (current && current.id !== id)
      throw new Error(`Guardian slot ${slot} already belongs to ${current.id}.`);
    const elsewhere = manifest.surfaces.findIndex((surface) => surface.id === id);
    if (elsewhere !== -1 && elsewhere !== slot)
      throw new Error(`${id} already occupies slot ${elsewhere}; refusing to shift indices.`);
    for (const [key, filename] of Object.entries(entry(id))) {
      if (key === 'id') continue;
      if (current && current[key] !== filename)
        throw new Error(`${id} has a different ${key} filename; reconcile before rebuilding.`);
      if (
        manifest.surfaces.some(
          (surface, i) =>
            i !== slot && ['albedo', 'normal', 'arm'].some((k) => surface[k] === filename),
        )
      )
        throw new Error(`Texture filename already used: ${filename}`);
    }
  }
}

const linear = (byte) => {
  const value = byte / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const byte = (value) => Math.round(Math.max(0, Math.min(1, value)) * 255);

function deriveMaps(rgb, material) {
  const luminance = new Float32Array(size * size);
  for (let pixel = 0; pixel < luminance.length; pixel++) {
    const p = pixel * 3;
    luminance[pixel] =
      linear(rgb[p]) * 0.2126 + linear(rgb[p + 1]) * 0.7152 + linear(rgb[p + 2]) * 0.0722;
  }
  const index = (x, y) => ((y + size) % size) * size + ((x + size) % size);
  const height = new Float32Array(luminance.length);
  // A small symmetric kernel removes pixel noise. Wrapped taps correspond to
  // the renderer's repeating UV sampler, including the first and last texels.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          sum += luminance[index(x + dx, y + dy)] * (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
      height[index(x, y)] = sum / 16;
    }
  const at = (x, y) => height[index(x, y)];
  const normal = Buffer.alloc(size * size * 3);
  const arm = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = index(x, y) * 3;
      const dx = (at(x - 1, y) - at(x + 1, y)) * material.strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * material.strength;
      const length = Math.hypot(dx, dy, 1);
      normal[p] = byte((dx / length) * 0.5 + 0.5);
      normal[p + 1] = byte((dy / length) * 0.5 + 0.5);
      normal[p + 2] = byte((1 / length) * 0.5 + 0.5);
      const shade = 1 - at(x, y);
      // Broad pigment value is not real occlusion: keep AO close to neutral,
      // with restrained roughness and metallic variation in the worn leaf.
      arm[p] = byte(0.97 + at(x, y) * 0.03);
      arm[p + 1] = byte(material.rough + shade * 0.06);
      arm[p + 2] = byte(material.metal * (0.75 + at(x, y) * 0.25));
    }
  return { normal, arm };
}

const original = JSON.parse(await readFile(manifestPath, 'utf8'));
validateSlots(original);
const metadata = await sharp(input).metadata();
if (
  !metadata.width ||
  metadata.width !== metadata.height ||
  metadata.width % 2 !== 0 ||
  metadata.width < size * 2
)
  throw new Error('The approved atlas must be an even square of at least 1024 × 1024.');
const quadrant = metadata.width / 2;
await mkdir(output, { recursive: true });
for (const [i, material] of definitions.entries()) {
  const { data: rgb, info } = await sharp(input)
    .extract({
      left: (i % 2) * quadrant,
      top: Math.floor(i / 2) * quadrant,
      width: quadrant,
      height: quadrant,
    })
    .resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`Expected three color channels for ${material.id}.`);
  const maps = deriveMaps(rgb, material);
  const raw = { width: size, height: size, channels: 3 };
  // Only the color map is sampled as sRGB. The raw RGB data maps have no gamma
  // operation or ICC profile and use lossless WebP to preserve channel values.
  await sharp(rgb, { raw })
    .webp({ quality: 96, effort: 6 })
    .toFile(path.join(output, `${material.id}_albedo.webp`));
  for (const [kind, buffer] of Object.entries(maps))
    await sharp(buffer, { raw })
      .webp({ lossless: true, effort: 6 })
      .toFile(path.join(output, `${material.id}_${kind}.webp`));
}

// Re-read after texture processing so unrelated additions remain present.
const current = JSON.parse(await readFile(manifestPath, 'utf8'));
validateSlots(current);
for (const [index, { id }] of definitions.entries()) {
  const slot = index + 25;
  if (current.surfaces.length < slot) throw new Error('Guardian surfaces must append in order.');
  current.surfaces[slot] = { ...current.surfaces[slot], ...entry(id) };
}
await writeFile(manifestPath, JSON.stringify(current, null, 2) + '\n');
console.log('Registered guardian_gilding/clouds/lamellar/pigment: slots 25–28, patterns 41–44.');
