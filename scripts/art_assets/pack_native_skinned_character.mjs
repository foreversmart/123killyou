import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readGltf } from './gltf.mjs';
import { simplifyCharacterMesh } from './simplify_character.mjs';

/** Pack a supplied skinned GLB without rebinding its native skeleton. */
const repository = fileURLToPath(new URL('../../', import.meta.url));
const id = process.argv[2] || 'luchen';
const defaultSources = {
  huipu: path.join(repository, 'assets/characters/hui_pu/huipu.zip'),
  linlan: path.join(repository, 'assets/characters/lin_lan/lin_lan.zip'),
  luchen: path.join(repository, 'assets/characters/lu_chen/lu_chen.zip'),
  xuzhi: path.join(repository, 'assets/characters/xu_zhi/xu_zhi.zip'),
  zhaoxi: path.join(repository, 'assets/characters/zhao_xi/zhaoxi.zip'),
};
const defaultSource =
  defaultSources[id] || path.join(repository, `assets/characters/${id}/${id}.zip`);
const source = path.resolve(process.argv[3] || defaultSource);
const output = path.join(repository, 'web/public/art/world');
const manifestPath = path.join(output, 'library.json');
const binaryPath = path.join(output, 'library.bin');
const sourceScale = 0.85;
// Keep the source-space translation explicit in metadata. Zhou Yan's scan is
// authored around the origin and the shared ground-contact pass lifts the
// completed pose onto the game floor after procedural leg corrections.
const sourceOffset = [0, 0, 0];
const modelMesh = id + '_model_skin';
const influenceFile = id + '_skin.bin';
const idBase = id + '_model';

function linear(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function factorColor(material) {
  const factor = material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1];
  return {
    r: Math.round(Math.max(0, Math.min(1, factor[0])) * 255),
    g: Math.round(Math.max(0, Math.min(1, factor[1])) * 255),
    b: Math.round(Math.max(0, Math.min(1, factor[2])) * 255),
    alpha: Math.max(0, Math.min(1, factor[3] ?? 1)),
  };
}

async function writeSurface(manifest, gltf, materialIndex, suffix = '', preferredIndex) {
  const material = gltf.json.materials[materialIndex] || {};
  const pbr = material.pbrMetallicRoughness || {};
  const albedo = gltf.texture(pbr.baseColorTexture?.index);
  const surfaceId = suffix ? `${idBase}_${suffix}` : idBase;
  const files = {
    albedo: surfaceId + '_albedo.webp',
    normal: surfaceId + '_normal.webp',
    arm: surfaceId + '_arm.webp',
  };
  const albedoImage = albedo
    ? sharp(albedo).resize(512, 512)
    : sharp({
        create: { width: 512, height: 512, channels: 4, background: factorColor(material) },
      });
  await albedoImage
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(path.join(output, files.albedo));
  for (const [type, texture, background] of [
    ['normal', gltf.texture(material.normalTexture?.index), { r: 128, g: 128, b: 255, alpha: 1 }],
    ['arm', gltf.texture(pbr.metallicRoughnessTexture?.index), { r: 255, g: 224, b: 0, alpha: 1 }],
  ]) {
    const image = texture
      ? sharp(texture).resize(512, 512)
      : sharp({ create: { width: 512, height: 512, channels: 4, background } });
    await image
      .webp({ quality: type === 'normal' ? 95 : 90, alphaQuality: 100 })
      .toFile(path.join(output, files[type]));
  }
  const surface = { id: surfaceId, ...files };
  const existing = manifest.surfaces.findIndex((entry) => entry.id === surface.id);
  if (preferredIndex !== undefined && preferredIndex >= 0) {
    manifest.surfaces[preferredIndex] = surface;
    return preferredIndex;
  }
  if (existing >= 0) manifest.surfaces[existing] = surface;
  else manifest.surfaces.push(surface);
  return existing >= 0 ? existing : manifest.surfaces.length - 1;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const previousSurface = manifest.surfaces.findIndex((surface) => surface.id === idBase);
const preferredSurface =
  previousSurface >= 0 ? previousSurface : manifest.characterModels?.[id]?.surface;
const original = await readFile(binaryPath);
const oldEntries = Object.entries(manifest.meshes)
  .filter(([mesh]) => !mesh.startsWith(id + '_model_'))
  .sort(([, a], [, b]) => a.vertexOffset - b.vertexOffset);
const chunks = [];
let offset = 0;
for (const [mesh, range] of oldEntries) {
  const end = range.indexOffset + range.indexCount * 4;
  const vertexBytes = range.vertexCount * 4;
  manifest.meshes[mesh] = { ...range, vertexOffset: offset, indexOffset: offset + vertexBytes };
  chunks.push(original.subarray(range.vertexOffset, end));
  offset += end - range.vertexOffset;
}
for (const mesh of Object.keys(manifest.meshes))
  if (mesh.startsWith(id + '_model_')) delete manifest.meshes[mesh];
// Keep existing surface slots stable: every packed vertex stores a numeric
// surface index, so removing a slot would retarget all later characters.

const gltf = await readGltf(source);
if (!gltf.meshes.length || gltf.meshes.some((mesh) => !mesh.skinned))
  throw new Error(`${source}: expected skinned mesh primitives`);
const firstMesh = gltf.meshes[0];
const skin = gltf.json.skins[firstMesh.skin];
if (!firstMesh.joints || !firstMesh.weights || !skin?.inverseBindMatrices)
  throw new Error(`${source}: missing joints, weights, or inverse bind matrices`);
const used = new Map();
const vertices = [];
const influences = [];
const remapped = [];
const materialSurfaces = new Map();
const materialSuffix = new Map([
  [0, ''],
  [1, 'hidden_palm'],
  [2, 'robe_contact_fill'],
]);
for (const mesh of gltf.meshes) {
  if (!mesh.joints || !mesh.weights)
    throw new Error(`${source}: primitive is missing skin influences`);
  const materialIndex = mesh.material ?? 0;
  let surface = materialSurfaces.get(materialIndex);
  if (surface === undefined) {
    surface = await writeSurface(
      manifest,
      gltf,
      materialIndex,
      materialSuffix.has(materialIndex)
        ? materialSuffix.get(materialIndex)
        : `material_${materialIndex}`,
      materialIndex === 0 ? preferredSurface : undefined,
    );
    materialSurfaces.set(materialIndex, surface);
  }
  const [indices] = await simplifyCharacterMesh(mesh);
  for (const index of indices) {
    const key = `${materialIndex}:${index}`;
    let target = used.get(key);
    if (target === undefined) {
      target = used.size;
      used.set(key, target);
      const p = mesh.positions.subarray(index * 3, index * 3 + 3);
      const n = mesh.normals.subarray(index * 3, index * 3 + 3);
      const uv = mesh.uv.subarray(index * 2, index * 2 + 2);
      vertices.push(
        p[0] * sourceScale + sourceOffset[0],
        p[1] * sourceScale + sourceOffset[1],
        p[2] * sourceScale + sourceOffset[2],
        ...n,
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
      influences.push(...mesh.joints.subarray(index * 4, index * 4 + 4));
      influences.push(...mesh.weights.subarray(index * 4, index * 4 + 4));
    }
    remapped.push(target);
  }
}
const vertexData = new Float32Array(vertices);
const indexData = new Uint32Array(remapped);
manifest.meshes[modelMesh] = {
  vertexOffset: offset,
  vertexCount: vertexData.length,
  indexOffset: offset + vertexData.byteLength,
  indexCount: indexData.length,
};
chunks.push(Buffer.from(vertexData.buffer), Buffer.from(indexData.buffer));
const surface = materialSurfaces.get(0);
// Runtime skin controls use the semantic side suffix convention used by the
// shared action bridge (`upper_arm.R`, `forearm.L`, ...).  Some supplied scans
// export Blender's equivalent lower-case underscore spelling.  Preserve the
// source joint indices and hierarchy while normalizing only the metadata names
// written to the runtime manifest.
const semanticNodeName = (name) =>
  name?.replace(
    /^(clavicle|upper_arm|forearm|hand|thigh|shin|foot|toe)_([lr])$/i,
    (_, bone, side) => `${bone}.${side.toUpperCase()}`,
  ) || name;
const runtimeNodes = gltf.json.nodes.map((node) => ({
  ...node,
  ...(node.name ? { name: semanticNodeName(node.name) } : {}),
}));
manifest.characterModels[id] = {
  name: id === 'luchen' ? '陆沉' : id === 'huipu' ? '慧普' : id === 'zhaoxi' ? '赵熙' : id,
  surface,
  scale: sourceScale,
  source: path.relative(repository, source),
  static: false,
  rigged: true,
  animationSource: 'npc_rigged.zip',
  animations: ['walk', 'welcome', 'observe', 'write', 'eat', 'offer_candle', 'night', 'turn_body'],
  parts: [modelMesh],
  skin: {
    mesh: modelMesh,
    joints: skin.joints,
    nodes: runtimeNodes,
    inverseBindMatrices: Array.from(gltf.accessor(skin.inverseBindMatrices)),
    influences: influenceFile,
    scale: sourceScale,
    offset: sourceOffset,
  },
};
await writeFile(binaryPath, Buffer.concat(chunks));
await writeFile(path.join(output, influenceFile), Buffer.from(new Float32Array(influences).buffer));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      id,
      sourceVertices: gltf.meshes.reduce((sum, mesh) => sum + mesh.positions.length / 3, 0),
      sourceTriangles: gltf.meshes.reduce((sum, mesh) => sum + mesh.indices.length / 3, 0),
      vertices: vertexData.length / 16,
      triangles: indexData.length / 3,
      materials: materialSurfaces.size,
      bones: skin.joints.length,
    },
    null,
    2,
  ),
);
