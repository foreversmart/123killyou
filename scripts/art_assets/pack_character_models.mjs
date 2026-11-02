import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readGltf } from './gltf.mjs';

const sourceRoot = process.argv[2];
if (!sourceRoot)
  throw new Error('Usage: node scripts/art_assets/pack_character_models.mjs <character-glb-directory>');

const output = 'web/public/art/world';
const manifestPath = path.join(output, 'library.json');
const binaryPath = path.join(output, 'library.bin');
const characters = [
  ['huipu', 'huipu.glb', '慧普'],
  ['linlan', 'lin_lan.glb', '林岚'],
  ['luchen', 'lu_chen.glb', '陆沉'],
  ['xuzhi', 'xu_zhi.glb', '许栀'],
  ['zhaoxi', 'zhaoxi.glb', '赵熙'],
  ['zhouyan', 'zhou_yan.glb', '周砚'],
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
  await sharp(albedo).resize(512, 512).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, files.albedo));
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 128, g: 128, b: 255, alpha: 1 } },
  }).webp({ quality: 95 }).toFile(path.join(output, files.normal));
  if (arm) await sharp(arm).resize(512, 512).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, files.arm));
  else {
    await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 224, b: 0, alpha: 1 } },
    }).webp({ quality: 90 }).toFile(path.join(output, files.arm));
  }
  const surface = { id: id + '_model', ...files };
  const existing = manifest.surfaces.findIndex((entry) => entry.id === surface.id);
  if (existing >= 0) manifest.surfaces[existing] = surface;
  else manifest.surfaces.push(surface);
  return existing >= 0 ? existing : manifest.surfaces.length - 1;
}

function appendMesh(id, sourceMesh, sourceIndices, surface, part, anchor) {
  let indices = Uint32Array.from(sourceIndices);
  const maximum = targetTriangles[part] * 3;
  if (indices.length > maximum) {
    [indices] = MeshoptSimplifier.simplify(
      indices,
      sourceMesh.positions,
      3,
      maximum - (maximum % 3),
      0.015,
      ['Permissive'],
    );
  }
  const packed = [];
  const remapped = [];
  const used = new Map();
  for (const index of indices) {
    let outputIndex = used.get(index);
    if (outputIndex === undefined) {
      outputIndex = used.size;
      used.set(index, outputIndex);
      const p = sourceMesh.positions.subarray(index * 3, index * 3 + 3);
      const n = sourceMesh.normals.subarray(index * 3, index * 3 + 3);
      const uv = sourceMesh.uv.subarray(index * 2, index * 2 + 2);
      packed.push(
        p[0] * worldScale - anchor[0],
        (p[1] + 1) * worldScale - anchor[1],
        p[2] * worldScale - anchor[2],
        n[0], n[1], n[2],
        linear(255), linear(255), linear(255),
        0.9, 0, 16 + surface, 0, uv[0], uv[1], -1,
      );
    }
    remapped.push(outputIndex);
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
  console.log(id + ': ' + vertices.length / 16 + ' vertices, ' + triangles.length / 3 + ' triangles');
}

function partFor(sourceMesh, a, b, c) {
  const cx = (sourceMesh.positions[a * 3] + sourceMesh.positions[b * 3] + sourceMesh.positions[c * 3]) / 3;
  const cy = (sourceMesh.positions[a * 3 + 1] + sourceMesh.positions[b * 3 + 1] + sourceMesh.positions[c * 3 + 1]) / 3;
  const bodyCenter = -0.005;
  const lateral = Math.abs(cx - bodyCenter);
  // The source is a watertight static scan rather than a rigged character.
  // These broad anatomical bands keep shoulders and hips on the same nodes as
  // the former authored rig while retaining the supplied silhouette.
  if (cy < -0.2) return cx < bodyCenter ? 'right_leg' : 'left_leg';
  if (lateral > 0.105 && cy < 0.42) return cx < bodyCenter ? 'right_arm' : 'left_arm';
  if (cy > 0.42) return 'head';
  return 'torso';
}

function anchorsFor(part, monk) {
  if (part === 'head') return [0, monk ? 1.52 : 1.57, 0];
  if (part === 'left_arm') return [0.215, 1.32, 0];
  if (part === 'right_arm') return [-0.215, 1.32, 0];
  if (part === 'left_leg') return [0.095, 0.82, 0];
  if (part === 'right_leg') return [-0.095, 0.82, 0];
  return [0, 0, 0];
}

for (const [id, file, name] of characters) {
  const source = path.join(sourceRoot, file);
  const gltf = await readGltf(source);
  if (gltf.meshes.length !== 1) throw new Error(source + ': expected one mesh');
  const surface = await writeSurface(id, gltf, source);
  const sourceMesh = gltf.meshes[0];
  const parts = new Map([
    ['torso', []], ['head', []], ['left_arm', []], ['right_arm', []],
    ['left_leg', []], ['right_leg', []],
  ]);
  for (let i = 0; i < sourceMesh.indices.length; i += 3) {
    const a = sourceMesh.indices[i], b = sourceMesh.indices[i + 1], c = sourceMesh.indices[i + 2];
    parts.get(partFor(sourceMesh, a, b, c)).push(a, b, c);
  }
  const monk = id === 'huipu' || id === 'luchen';
  for (const [part, indices] of parts) {
    if (!indices.length) throw new Error(source + ': no triangles classified as ' + part);
    appendMesh(id + '_model_' + part, sourceMesh, indices, surface, part, anchorsFor(part, monk));
  }
  manifest.characterModels[id] = {
    name,
    surface,
    scale: worldScale,
    source: file,
    static: true,
    parts: [...parts.keys()].map((part) => id + '_model_' + part),
  };
}

await writeFile(binaryPath, Buffer.concat(chunks));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
