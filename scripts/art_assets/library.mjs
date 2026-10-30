import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';

export async function createLibrary(output) {
  await mkdir(output, { recursive: true });
  await MeshoptSimplifier.ready;
  const manifest = {
    surfaces: [],
    meshes: {},
    binary: 'library.bin',
    skies: ['sky_day.webp', 'sky_night.webp'],
  };
  const chunks = [];
  let offset = 0;
  async function surface(id, albedo, normal, arm, roughness = 0.85) {
    const entry = { id };
    for (const [kind, source, fallback] of [
      ['albedo', albedo, [255, 255, 255, 255]],
      ['normal', normal, [128, 128, 255, 255]],
      ['arm', arm, [255, Math.round(roughness * 255), 0, 255]],
    ]) {
      const image = source
        ? sharp(source)
        : sharp({
            create: {
              width: 1,
              height: 1,
              channels: 4,
              background: { r: fallback[0], g: fallback[1], b: fallback[2], alpha: 1 },
            },
          });
      entry[kind] = id + '_' + kind + '.webp';
      await image
        .resize(512, 512)
        .webp({ quality: kind === 'normal' ? 95 : 90, alphaQuality: 100 })
        .toFile(path.join(output, entry[kind]));
    }
    manifest.surfaces.push(entry);
    return manifest.surfaces.length - 1;
  }
  function mesh(id, parts, budget = 16000, transform = (p) => p) {
    const packed = [],
      indices = [];
    let base = 0;
    for (const part of parts) {
      const src = part.mesh;
      let ids = new Uint32Array(src.indices);
      const target = Math.max(300, Math.floor(budget / parts.length) * 3);
      if (ids.length > target && !part.preserve) {
        [ids] = MeshoptSimplifier.simplify(ids, src.positions, 3, target - (target % 3), 0.035, [
          'Permissive',
        ]);
      }
      const used = new Map();
      for (const index of ids) {
        if (!used.has(index)) {
          const p = transform(Array.from(src.positions.subarray(index * 3, index * 3 + 3)));
          const n = Array.from(src.normals.subarray(index * 3, index * 3 + 3));
          used.set(index, base++);
          const color = part.color?.(p) || [1, 1, 1];
          packed.push(
            ...p,
            ...n,
            ...color,
            1,
            1,
            16 + part.surface,
            0,
            src.uv[index * 2],
            src.uv[index * 2 + 1],
            -1,
          );
        }
        indices.push(used.get(index));
      }
    }
    const vertices = new Float32Array(packed),
      triangles = new Uint32Array(indices);
    manifest.meshes[id] = {
      vertexOffset: offset,
      vertexCount: vertices.length,
      indexOffset: offset + vertices.byteLength,
      indexCount: triangles.length,
    };
    chunks.push(Buffer.from(vertices.buffer), Buffer.from(triangles.buffer));
    offset += vertices.byteLength + triangles.byteLength;
    console.log(id, base + ' vertices', indices.length / 3 + ' triangles');
  }
  async function save() {
    await writeFile(path.join(output, 'library.bin'), Buffer.concat(chunks));
    await writeFile(path.join(output, 'library.json'), JSON.stringify(manifest, null, 2));
  }
  return { surface, mesh, save, manifest };
}
