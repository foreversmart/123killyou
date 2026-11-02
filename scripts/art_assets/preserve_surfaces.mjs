import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Keep appended project artwork in its existing slots when base assets are rebuilt. */
export async function preserveSurfaces(manifest, output) {
  let previous;
  try {
    previous = JSON.parse(await readFile(path.join(output, 'library.json'), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!Array.isArray(previous.surfaces)) throw new Error('Existing library has no surface list.');
  const baseCount = manifest.surfaces.length;
  for (let index = 0; index < Math.min(baseCount, previous.surfaces.length); index++) {
    if (manifest.surfaces[index].id !== previous.surfaces[index].id)
      throw new Error(
        `Surface slot ${index} changed; reconcile material references before saving.`,
      );
  }
  const retained = previous.surfaces.slice(baseCount);
  const ids = new Set(manifest.surfaces.map((surface) => surface.id));
  const files = new Set(
    manifest.surfaces.flatMap((surface) => [surface.albedo, surface.normal, surface.arm]),
  );
  // Validate every retained file before changing the new manifest. These are
  // already-final runtime textures: keep their exact bytes and stable names.
  for (const surface of retained) {
    if (typeof surface.id !== 'string' || ids.has(surface.id))
      throw new Error('Duplicate or invalid retained surface: ' + surface.id);
    ids.add(surface.id);
    for (const kind of ['albedo', 'normal', 'arm']) {
      const file = surface[kind];
      if (typeof file !== 'string' || !/^[a-z0-9_]+\.webp$/.test(file) || files.has(file))
        throw new Error('Duplicate or invalid retained texture: ' + file);
      files.add(file);
      const image = await sharp(await readFile(path.join(output, file))).metadata();
      if (image.width !== 512 || image.height !== 512)
        throw new Error('Retained texture must be 512 × 512: ' + file);
    }
  }
  manifest.surfaces.push(...retained);
  return retained.map((surface) => surface.id);
}
