import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readGltf } from './gltf.mjs';
import { normalizeLinLanSkeleton, nativeLinLanSkin } from './lin_lan_skeleton.mjs';
import { rebindScan } from './skinned_rebind.mjs';
import { splitScanRegions } from './skinned_regions.mjs';
import { writeSkinnedSurface } from './skinned_surface.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(repository, 'assets/characters/lin_lan/lin_lan.zip');
const supplied = process.argv[2] && path.resolve(process.argv[2]);
if (supplied && supplied !== source) {
  if (!supplied.endsWith('.zip'))
    throw new Error('Lin Lan 的输入必须是包含 GLB 的 ZIP 文件。');
  await mkdir(path.dirname(source), { recursive: true });
  await copyFile(supplied, source);
}
const output = path.join(repository, 'web/public/art/world');
const manifestPath = path.join(output, 'library.json');
const binaryPath = path.join(output, 'library.bin');
let manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const gltf = normalizeLinLanSkeleton(await readGltf(source));
if (gltf.meshes.length !== 1 || !gltf.meshes[0].skinned)
  throw new Error('Lin Lan must contain one skinned mesh.');
const mesh = gltf.meshes[0];
const skin = gltf.json.skins[mesh.skin];
if (!mesh.joints || !mesh.weights || !skin?.inverseBindMatrices)
  throw new Error('Lin Lan requires joints, weights and inverse bind matrices.');
const attributes = new Float32Array((mesh.positions.length / 3) * 5);
for (let vertex = 0; vertex < mesh.positions.length / 3; vertex++) {
  attributes.set(mesh.normals.subarray(vertex * 3, vertex * 3 + 3), vertex * 5);
  attributes.set(mesh.uv.subarray(vertex * 2, vertex * 2 + 2), vertex * 5 + 3);
}
await MeshoptSimplifier.ready;
const [indices, error] = MeshoptSimplifier.simplifyWithAttributes(
  mesh.indices,
  mesh.positions,
  3,
  attributes,
  5,
  [0.01, 0.01, 0.01, 0.025, 0.025],
  null,
  40000 * 3,
  0.005,
  ['Permissive'],
);
const surface = await writeSkinnedSurface(manifest, gltf, output);
const used = new Map();
const vertices = [];
const sourceVertexIndices = [];
const remapped = [];
for (const index of indices) {
  let target = used.get(index);
  if (target === undefined) {
    target = used.size;
    used.set(index, target);
    sourceVertexIndices.push(index);
    const p = mesh.positions.subarray(index * 3, index * 3 + 3);
    const n = mesh.normals.subarray(index * 3, index * 3 + 3);
    const uv = mesh.uv.subarray(index * 2, index * 2 + 2);
    vertices.push(
      p[0] * 0.85,
      (p[1] + 1) * 0.85,
      p[2] * 0.85,
      ...n,
      1,
      1,
      1,
      0.9,
      0,
      16 + surface,
      0,
      ...uv,
      -1,
    );
  }
  remapped.push(target);
}

const regions = await splitScanRegions(
  new Float32Array(vertices),
  new Uint32Array(remapped),
  path.join(output, 'linlan_model_albedo.webp'),
);
const vertexData = regions.vertices;
const indexData = regions.indices;
const fitted = nativeLinLanSkin(gltf, skin);
const sourceWeights = regions.sourceIndices.map((packedIndex) => {
  const sourceIndex = sourceVertexIndices[packedIndex];
  const values = [];
  for (let slot = 0; slot < 4; slot++) {
    const weight = mesh.weights[sourceIndex * 4 + slot];
    if (weight > 0) values.push([mesh.joints[sourceIndex * 4 + slot], weight]);
  }
  return values;
});
const influenceData = await rebindScan(
  vertexData,
  indexData,
  fitted,
  regions.regions,
  sourceWeights,
);
// Independent art work may update the shared library while Blender binds.
// Always preserve the latest other meshes and their surface slots.
const current = JSON.parse(await readFile(manifestPath, 'utf8'));
if (current.surfaces.findIndex((entry) => entry.id === 'linlan_model') !== surface)
  throw new Error('Surface slots changed during binding; run the packer again.');
current.surfaces[surface] = manifest.surfaces[surface];
manifest = current;
const original = await readFile(binaryPath);
// Repack each retained mesh byte-for-byte. Only offsets change after removing
// Lin Lan's former rigid shells; no other character is decoded or simplified.
const chunks = [];
let offset = 0;
for (const [id, range] of Object.entries(manifest.meshes).sort(
  (a, b) => a[1].vertexOffset - b[1].vertexOffset,
)) {
  if (id.startsWith('linlan_model_')) {
    delete manifest.meshes[id];
    continue;
  }
  const end = range.indexOffset + range.indexCount * 4;
  const chunk = original.subarray(range.vertexOffset, end);
  const vertexBytes = range.vertexCount * 4;
  manifest.meshes[id] = { ...range, vertexOffset: offset, indexOffset: offset + vertexBytes };
  chunks.push(chunk);
  offset += chunk.byteLength;
}
const id = 'linlan_model_skin';
manifest.meshes[id] = {
  vertexOffset: offset,
  vertexCount: vertexData.length,
  indexOffset: offset + vertexData.byteLength,
  indexCount: indexData.length,
};
chunks.push(Buffer.from(vertexData.buffer), Buffer.from(indexData.buffer));
manifest.characterModels.linlan = {
  name: '林岚',
  surface,
  scale: 0.85,
  source: 'assets/characters/lin_lan/lin_lan.zip',
  static: false,
  rigged: true,
  animationSource: 'npc_rigged.zip',
  animations: ['walk', 'welcome', 'observe', 'write', 'eat', 'offer_candle', 'night', 'turn_body'],
  parts: [id],
  skin: {
    mesh: id,
    ...fitted,
    camera: regions.camera,
    influences: 'linlan_skin.bin',
    scale: 0.85,
    offset: [0, 0.85, 0],
  },
};
async function writeCurrent(file, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const existing = await readFile(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (!existing?.equals(bytes)) await writeFile(file, bytes);
}
await writeCurrent(binaryPath, Buffer.concat(chunks));
await writeCurrent(path.join(output, 'linlan_skin.bin'), Buffer.from(influenceData.buffer));
await writeCurrent(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      sourceVertices: mesh.positions.length / 3,
      sourceTriangles: mesh.indices.length / 3,
      vertices: vertexData.length / 16,
      triangles: indexData.length / 3,
      error,
      regions: regions.counts,
      influenceBytes: influenceData.byteLength,
      meshBytes: vertexData.byteLength + indexData.byteLength,
    },
    null,
    2,
  ),
);
