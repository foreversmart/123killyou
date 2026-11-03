import { mat4 } from 'wgpu-matrix';
import { node, type Geometry, type WorldNode } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { roadNearest } from '@/scene/world_environment/road_path';

type Source = {
  remap: Int32Array;
  indices: Uint32Array;
  count: number;
  clumps?: Int32Array;
  roots: number[];
};
type Plant = {
  geometry: Geometry;
  source: Source;
  matrix: Float32Array;
  normal: Float32Array;
  remap: Int32Array;
  vertices: number;
  indices: number;
  roots: Float64Array;
  groundOffsets?: Float64Array;
};
type Batch = { plants: Plant[]; vertices: number; indices: number; shadow: boolean };
const sources = new WeakMap<Geometry, Source>();
const seedAt = (x: number, z: number) => {
  const value = Math.sin(x * 12.9898 + z * 78.233 + 4.1) * 43758.5453;
  return value - Math.floor(value);
};

/** A dropped Tidewater crown lobe collapses to zero-area faces in the original variant. */
function nondegenerateIndices(geometry: Geometry) {
  const { vertices: v, indices } = geometry;
  const kept = new Uint32Array(indices.length);
  let count = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 16,
      b = indices[i + 1] * 16,
      c = indices[i + 2] * 16;
    const ux = v[b] - v[a],
      uy = v[b + 1] - v[a + 1],
      uz = v[b + 2] - v[a + 2];
    const vx = v[c] - v[a],
      vy = v[c + 1] - v[a + 1],
      vz = v[c + 2] - v[a + 2];
    const x = uy * vz - uz * vy,
      y = uz * vx - ux * vz,
      z = ux * vy - uy * vx;
    if (x * x + y * y + z * z <= 1e-16) continue;
    kept[count++] = indices[i];
    kept[count++] = indices[i + 1];
    kept[count++] = indices[i + 2];
  }
  return count === indices.length ? indices : kept.slice(0, count);
}

/** Shared source topology is indexed once, including each grass vertex's clump. */
function sourceFor(geometry: Geometry): Source {
  const cached = sources.get(geometry);
  if (cached) return cached;
  const { vertices } = geometry;
  const count = vertices.length / 16;
  const indices = nondegenerateIndices(geometry);
  const source: Source = {
    remap: new Int32Array(count).fill(-1),
    indices,
    count: 0,
    roots: [],
  };
  for (const index of indices) source.remap[index] = 0;
  for (let i = 0; i < count; i++) if (source.remap[i] >= 0) source.remap[i] = source.count++;
  const clumps = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const offset = i * 16;
    if (vertices[offset + 11] !== 140) continue;
    source.clumps ??= new Int32Array(count).fill(-1);
    const x = vertices[offset + 6],
      z = vertices[offset + 7];
    const key = `${x}:${z}`;
    let clump = clumps.get(key);
    if (clump === undefined) {
      clump = clumps.size;
      clumps.set(key, clump);
      source.roots.push(x, z);
    }
    source.clumps[i] = clump;
  }
  sources.set(geometry, source);
  return source;
}

function prepare(plant: WorldNode, geometry: Geometry, matrix: Float32Array): Plant {
  const source = sourceFor(geometry);
  const result: Plant = {
    geometry,
    source,
    matrix,
    normal: mat4.transpose(mat4.inverse(matrix)),
    remap: source.remap,
    vertices: source.count,
    indices: source.indices.length,
    roots: new Float64Array([matrix[12], matrix[13], matrix[14], seedAt(matrix[12], matrix[14])]),
  };
  if (!source.clumps) return result;
  const clumpCount = source.roots.length / 2;
  const keep = new Uint8Array(clumpCount);
  result.roots = new Float64Array(clumpCount * 4);
  result.groundOffsets = new Float64Array(clumpCount);
  // A whole clump shares its root. Terrain queries never run for individual blades.
  for (let i = 0; i < clumpCount; i++) {
    const localX = source.roots[i * 2],
      localZ = source.roots[i * 2 + 1];
    const clip = plant.vegetationClip;
    if (clip && (localX < clip[0] || localZ < clip[1] || localX > clip[2] || localZ > clip[3]))
      continue;
    const x = matrix[0] * localX + matrix[8] * localZ + matrix[12];
    const y = matrix[1] * localX + matrix[9] * localZ + matrix[13];
    const z = matrix[2] * localX + matrix[10] * localZ + matrix[14];
    if (
      plant.vegetationGround &&
      (templeClearance(x, z) <= 0.75 || (z > 11 && z < 175 && roadNearest(x, z).distance < 4.5))
    )
      continue;
    const ground = plant.vegetationGround ? terrainHeight(x, z, plant.vegetationRoad) : y;
    keep[i] = 1;
    result.roots.set([x, ground, z, seedAt(x, z)], i * 4);
    result.groundOffsets[i] = ground - y;
  }
  const indices = source.indices;
  const remap = new Int32Array(source.remap.length).fill(-1);
  result.indices = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i],
      b = indices[i + 1],
      c = indices[i + 2];
    if (!keep[source.clumps[a]] || !keep[source.clumps[b]] || !keep[source.clumps[c]]) continue;
    remap[a] = remap[b] = remap[c] = 0;
    result.indices += 3;
  }
  result.vertices = 0;
  for (let i = 0; i < remap.length; i++) if (remap[i] >= 0) remap[i] = result.vertices++;
  result.remap = remap;
  return result;
}

/** Each spatial batch allocates only the vertices referenced by retained triangles. */
function pack(batch: Batch): Geometry {
  const vertices = new Float32Array(batch.vertices * 16);
  const indices = new Uint32Array(batch.indices);
  const vegetation = new Float32Array(batch.vertices * 4);
  let vertexOffset = 0,
    indexOffset = 0;
  for (const plant of batch.plants) {
    const { geometry, matrix: m, normal: n, remap, source } = plant;
    const data = geometry.vertices;
    for (let i = 0; i < remap.length; i++) {
      if (remap[i] < 0) continue;
      const input = i * 16,
        output = (vertexOffset + remap[i]) * 16;
      const clump = source.clumps?.[i] ?? -1;
      const rootOffset = clump < 0 ? 0 : clump * 4;
      const x = data[input],
        y = data[input + 1],
        z = data[input + 2];
      const nx = data[input + 3],
        ny = data[input + 4],
        nz = data[input + 5];
      const normalX = n[0] * nx + n[4] * ny + n[8] * nz;
      const normalY = n[1] * nx + n[5] * ny + n[9] * nz;
      const normalZ = n[2] * nx + n[6] * ny + n[10] * nz;
      const length = Math.hypot(normalX, normalY, normalZ) || 1;
      vertices[output] = m[0] * x + m[4] * y + m[8] * z + m[12];
      vertices[output + 1] =
        m[1] * x + m[5] * y + m[9] * z + m[13] + (plant.groundOffsets?.[clump] ?? 0);
      vertices[output + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      vertices[output + 3] = normalX / length;
      vertices[output + 4] = normalY / length;
      vertices[output + 5] = normalZ / length;
      for (let channel = 6; channel < 16; channel++)
        vertices[output + channel] = data[input + channel];
      for (let channel = 0; channel < 4; channel++)
        vegetation[(vertexOffset + remap[i]) * 4 + channel] = plant.roots[rootOffset + channel];
      if (clump >= 0) {
        vertices[output + 6] = plant.roots[rootOffset];
        vertices[output + 7] = plant.roots[rootOffset + 2];
      }
    }
    for (let i = 0; i < source.indices.length; i += 3) {
      const a = remap[source.indices[i]],
        b = remap[source.indices[i + 1]],
        c = remap[source.indices[i + 2]];
      if (a < 0 || b < 0 || c < 0) continue;
      indices[indexOffset++] = a + vertexOffset;
      indices[indexOffset++] = b + vertexOffset;
      indices[indexOffset++] = c + vertexOffset;
    }
    vertexOffset += plant.vertices;
  }
  return { vertices, indices, vegetation };
}

/** Pack static plants by spatial cell; authored roots and seeds remain per vertex. */
export function batchVegetation(root: WorldNode, assets: Map<string, Geometry>) {
  const batches = new Map<string, Batch>();
  function visit(plant: WorldNode, parent: Float32Array) {
    plant.children = plant.children.filter((child) => !child.name.startsWith('vegetation_batch_'));
    let matrix = mat4.translate(parent, plant.position);
    matrix = mat4.rotateY(matrix, plant.rotation[1]);
    matrix = mat4.rotateX(matrix, plant.rotation[0]);
    matrix = mat4.rotateZ(matrix, plant.rotation[2]);
    matrix = mat4.scale(matrix, plant.scale);
    if (plant.asset?.startsWith('tidewater_')) {
      const geometry = assets.get(plant.asset);
      if (!geometry) throw new Error('缺少植被模型：' + plant.asset);
      const prepared = prepare(plant, geometry, matrix);
      if (prepared.indices) {
        const shadow = plant.shadow !== false;
        const key = [Math.floor(matrix[12] / 48), Math.floor(matrix[14] / 48), shadow].join('_');
        let batch = batches.get(key);
        if (!batch) {
          batch = { plants: [], vertices: 0, indices: 0, shadow };
          batches.set(key, batch);
        }
        batch.plants.push(prepared);
        batch.vertices += prepared.vertices;
        batch.indices += prepared.indices;
      }
    }
    plant.children.forEach((child) => visit(child, matrix));
  }
  visit(root, mat4.identity());
  for (const [key, batch] of batches) {
    const mesh = node('vegetation_batch_' + key, pack(batch));
    mesh.wind = 1;
    mesh.shadow = batch.shadow;
    root.children.push(mesh);
  }
}
