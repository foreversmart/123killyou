import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { readGltf } from './gltf.mjs';
import { partFor, anchorsFor, partCandidates } from './character_parts.mjs';

const sourceRoot = process.argv[2];
if (!sourceRoot)
  throw new Error(
    'Usage: node scripts/art_assets/pack_character_models.mjs <character-zip-directory>',
  );

const output = 'web/public/art/world';
const manifestPath = path.join(output, 'library.json');
const binaryPath = path.join(output, 'library.bin');
const characters = [
  ['linlan', 'lin_lan.zip', '林岚'],
  ['luchen', 'lu_chen.zip', '陆沉'],
  ['zhaoxi', 'zhaoxi.zip', '赵熙'],
];
const targetTriangles = {
  torso: 12000,
  head: 6000,
  left_arm: 4000,
  right_arm: 4000,
  left_leg: 4000,
  right_leg: 4000,
};
// The supplied files use a two metre authoring box (after the glTF node's
// scale). Normalize it to the game's roughly 1.7 m character height and move
// feet onto y=0 before splitting the static mesh into rig parts.
const worldScale = 0.85;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const originalBinary = await readFile(binaryPath);
const modelMeshIds = Object.keys(manifest.meshes).filter((id) => /(^|_)model(_|$)/.test(id));
const baseOffset = modelMeshIds.length
  ? Math.min(...modelMeshIds.map((id) => manifest.meshes[id].vertexOffset))
  : originalBinary.byteLength;
modelMeshIds.forEach((id) => delete manifest.meshes[id]);
const chunks = [originalBinary.subarray(0, baseOffset)];
let offset = baseOffset;
manifest.characterModels = {};
await MeshoptSimplifier.ready;

function linear(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

async function writeSurface(id, gltf, source) {
  const material = gltf.json.materials[0] || {};
  const pbr = material.pbrMetallicRoughness || {};
  const albedo = gltf.texture(pbr.baseColorTexture?.index);
  const arm = gltf.texture(pbr.metallicRoughnessTexture?.index);
  if (!albedo) throw new Error(source + ': missing base color texture');
  const files = {
    albedo: id + '_model_albedo.webp',
    normal: id + '_model_normal.webp',
    arm: id + '_model_arm.webp',
  };
  await sharp(albedo)
    .resize(512, 512)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(path.join(output, files.albedo));
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 128, g: 128, b: 255, alpha: 1 },
    },
  })
    .webp({ quality: 95 })
    .toFile(path.join(output, files.normal));
  if (arm)
    await sharp(arm)
      .resize(512, 512)
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(path.join(output, files.arm));
  else {
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 224, b: 0, alpha: 1 },
      },
    })
      .webp({ quality: 90 })
      .toFile(path.join(output, files.arm));
  }
  const surface = { id: id + '_model', ...files };
  const existing = manifest.surfaces.findIndex((entry) => entry.id === surface.id);
  if (existing >= 0) manifest.surfaces[existing] = surface;
  else manifest.surfaces.push(surface);
  return existing >= 0 ? existing : manifest.surfaces.length - 1;
}

function appendMesh(
  id,
  sourceMesh,
  sourceIndices,
  surface,
  part,
  anchor,
  seamTriangles = new Set(),
) {
  let indices = Uint32Array.from(sourceIndices);
  const maximum = targetTriangles[part] * 3;
  // Keep a bounded, evenly distributed sample of the overlap band. Dense
  // scan clothing folds can otherwise duplicate most of a part and inflate
  // the packed runtime mesh.
  const seamLimit = Math.max(24, Math.floor((maximum / 3) * 0.12));
  const seamList = [...seamTriangles].sort((a, b) => a - b);
  const seamStride = Math.max(1, Math.ceil(seamList.length / seamLimit));
  const protectedSeams = new Set(
    seamList.filter((_, index) => index % seamStride === 0).slice(0, seamLimit),
  );
  const seamKeys = new Set();
  for (const triangle of protectedSeams) {
    const start = triangle * 3;
    seamKeys.add(
      [sourceIndices[start], sourceIndices[start + 1], sourceIndices[start + 2]]
        .sort((a, b) => a - b)
        .join(','),
    );
  }
  if (indices.length > maximum) {
    const simplifyMaximum = Math.max(3, maximum - protectedSeams.size * 3);
    [indices] = MeshoptSimplifier.simplify(
      indices,
      sourceMesh.positions,
      3,
      simplifyMaximum - (simplifyMaximum % 3),
      0.015,
      ['Permissive'],
    );
    // Meshopt can discard a narrow seam triangle while simplifying. Add any
    // missing seam triangles back so the overlap remains present in the
    // shipped mesh even when the main surface is reduced to its budget.
    const retained = new Set();
    for (let i = 0; i < indices.length; i += 3)
      retained.add([indices[i], indices[i + 1], indices[i + 2]].sort((a, b) => a - b).join(','));
    const seamAdditions = [];
    for (const triangle of protectedSeams) {
      const start = triangle * 3;
      const key = [sourceIndices[start], sourceIndices[start + 1], sourceIndices[start + 2]]
        .sort((a, b) => a - b)
        .join(',');
      if (!retained.has(key))
        seamAdditions.push(
          sourceIndices[start],
          sourceIndices[start + 1],
          sourceIndices[start + 2],
        );
    }
    if (seamAdditions.length) indices = Uint32Array.from([...indices, ...seamAdditions]);
  }
  const packed = [];
  const remapped = [];
  const used = new Map();
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const seam = seamKeys.has(
      [indices[triangle], indices[triangle + 1], indices[triangle + 2]]
        .sort((a, b) => a - b)
        .join(','),
    );
    for (let corner = 0; corner < 3; corner++) {
      const index = indices[triangle + corner];
      // Keep seam and regular copies separate when a vertex lies on the edge
      // of the overlap band; otherwise moving the seam copy would also move a
      // neighbouring non-seam triangle in the same part.
      const key = seam ? index + ':seam' : index;
      let outputIndex = used.get(key);
      if (outputIndex === undefined) {
        outputIndex = used.size;
        used.set(key, outputIndex);
        const p = sourceMesh.positions.subarray(index * 3, index * 3 + 3);
        const n = sourceMesh.normals.subarray(index * 3, index * 3 + 3);
        const uv = sourceMesh.uv.subarray(index * 2, index * 2 + 2);
        // A narrow copy of each cut triangle closes the rigid-part seams while
        // leaving the source surface unchanged. Inset torso/head copies stay
        // behind the moving limb; outward limb copies keep the joint covered as
        // the limb rotates away. This avoids the exposed shoulder/hip edges that
        // appeared when every triangle belonged to only one rigid part.
        const seamOffset = seam ? (part === 'torso' || part === 'head' ? -0.002 : 0.002) : 0;
        packed.push(
          (p[0] + n[0] * seamOffset) * worldScale - anchor[0],
          (p[1] + n[1] * seamOffset + 1) * worldScale - anchor[1],
          (p[2] + n[2] * seamOffset) * worldScale - anchor[2],
          n[0],
          n[1],
          n[2],
          linear(255),
          linear(255),
          linear(255),
          0.9,
          0,
          16 + surface,
          0,
          uv[0],
          uv[1],
          -1,
        );
      }
      remapped.push(outputIndex);
    }
  }
  const vertices = new Float32Array(packed);
  const triangles = new Uint32Array(remapped);
  const vertexOffset = offset;
  const indexOffset = vertexOffset + vertices.byteLength;
  manifest.meshes[id] = {
    vertexOffset,
    vertexCount: vertices.length,
    indexOffset,
    indexCount: triangles.length,
  };
  chunks.push(Buffer.from(vertices.buffer), Buffer.from(triangles.buffer));
  offset = indexOffset + triangles.byteLength;
  console.log(
    id + ': ' + vertices.length / 16 + ' vertices, ' + triangles.length / 3 + ' triangles',
  );
}

for (const [id, file, name] of characters) {
  const source = path.join(sourceRoot, file);
  const gltf = await readGltf(source);
  if (gltf.meshes.length !== 1) throw new Error(source + ': expected one mesh');
  const surface = await writeSurface(id, gltf, source);
  const sourceMesh = gltf.meshes[0];
  const parts = new Map([
    ['torso', { indices: [], seams: [] }],
    ['head', { indices: [], seams: [] }],
    ['left_arm', { indices: [], seams: [] }],
    ['right_arm', { indices: [], seams: [] }],
    ['left_leg', { indices: [], seams: [] }],
    ['right_leg', { indices: [], seams: [] }],
  ]);
  for (let i = 0; i < sourceMesh.indices.length; i += 3) {
    const a = sourceMesh.indices[i],
      b = sourceMesh.indices[i + 1],
      c = sourceMesh.indices[i + 2];
    const primary = partFor(sourceMesh, a, b, c);
    for (const part of partCandidates(sourceMesh, a, b, c)) {
      const target = parts.get(part);
      const triangle = target.indices.length / 3;
      target.indices.push(a, b, c);
      if (part !== primary) target.seams.push(triangle);
    }
  }
  const monk = id === 'huipu' || id === 'luchen';
  for (const [part, data] of parts) {
    if (!data.indices.length) throw new Error(source + ': no triangles classified as ' + part);
    appendMesh(
      id + '_model_' + part,
      sourceMesh,
      data.indices,
      surface,
      part,
      anchorsFor(part, monk),
      new Set(data.seams),
    );
  }
  manifest.characterModels[id] = {
    name,
    surface,
    scale: worldScale,
    source: file,
    static: true,
    rigged: true,
    animationSource: 'npc_rigged.zip',
    animations: [
      'walk',
      'welcome',
      'observe',
      'write',
      'eat',
      'offer_candle',
      'night',
      'turn_body',
    ],
    parts: [...parts.keys()].map((part) => id + '_model_' + part),
  };
}

await writeFile(binaryPath, Buffer.concat(chunks));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
// Lin Lan's checked-in skinned source is authoritative; never leave the
// all-character rebuild with her former six rigid shells.
execFileSync(process.execPath, ['scripts/art_assets/pack_skinned_character.mjs'], {
  stdio: 'inherit',
});
// Lu Chen's supplied GLB has its own native skeleton and weights. Replace the
// temporary rigid parts emitted above with one skinned mesh after the shared
// library has been rebuilt.
execFileSync(process.execPath, ['scripts/art_assets/pack_native_skinned_character.mjs', 'luchen'], {
  stdio: 'inherit',
});
// Xu Zhi ships as a single native skinned mesh. Keep her out of the rigid
// six-part pack above so future art rebuilds retain the supplied skeleton.
execFileSync(
  process.execPath,
  [
    'scripts/art_assets/pack_native_skinned_character.mjs',
    'xuzhi',
    path.join(sourceRoot, 'xu_zhi.zip'),
  ],
  { stdio: 'inherit' },
);
// Hui Pu ships as the supplied native 60-bone scan. Keep all contact-fill
// primitives and reuse the shared semantic action clips.
execFileSync(
  process.execPath,
  [
    'scripts/art_assets/pack_native_skinned_character.mjs',
    'huipu',
    path.resolve('assets/characters/hui_pu/huipu.zip'),
  ],
  { stdio: 'inherit' },
);
// Zhou Yan's replacement scan is kept at a stable role-specific source path
// instead of the generated source directory, and preserves its native
// 53-bone skin with the same shared semantic action clips.
execFileSync(
  process.execPath,
  [
    'scripts/art_assets/pack_native_skinned_character.mjs',
    'zhouyan',
    path.resolve('assets/characters/zhou_yan/zhou_yan_rigged.zip'),
  ],
  { stdio: 'inherit' },
);
// Zhao Xi's replacement scan is the authoritative current source for the
// player character. Preserve its native 53-bone skin and share the semantic
// action clips with the other supplied characters.
execFileSync(
  process.execPath,
  [
    'scripts/art_assets/pack_native_skinned_character.mjs',
    'zhaoxi',
    path.resolve('assets/characters/zhao_xi/zhaoxi.zip'),
  ],
  { stdio: 'inherit' },
);
