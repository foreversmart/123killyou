import { MeshoptSimplifier } from 'meshoptimizer';

// Simplify each leaf in its own bounds. Simplifying a whole crown erases small leaves first.
export function foliage(source, density) {
  const parent = Uint32Array.from({ length: source.positions.length / 3 }, (_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < source.indices.length; i += 3) {
    const root = find(source.indices[i]);
    parent[find(source.indices[i + 1])] = root;
    parent[find(source.indices[i + 2])] = root;
  }
  const leaves = new Map();
  for (let i = 0; i < source.indices.length; i += 3) {
    const key = find(source.indices[i]);
    if (!leaves.has(key)) leaves.set(key, []);
    leaves.get(key).push(...source.indices.subarray(i, i + 3));
  }
  const positions = source.positions.slice(),
    indices = [];
  let seed = 913;
  for (const triangles of leaves.values()) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    if (seed / 4294967296 > density) continue;
    const used = [...new Set(triangles)],
      remap = new Map(used.map((v, i) => [v, i]));
    const points = new Float32Array(
      used.flatMap((i) => [...source.positions.subarray(i * 3, i * 3 + 3)]),
    );
    const local = new Uint32Array(triangles.map((i) => remap.get(i)));
    const [simplified] = MeshoptSimplifier.simplify(local, points, 3, 6, 0.25, ['Permissive']);
    const center = [0, 0, 0];
    for (let i = 0; i < points.length; i++) center[i % 3] += points[i] / used.length;
    const scale = Math.min(3.0, Math.sqrt(1.8 / density));
    for (const i of used)
      for (let axis = 0; axis < 3; axis++)
        positions[i * 3 + axis] = center[axis] + (positions[i * 3 + axis] - center[axis]) * scale;
    for (const index of simplified) indices.push(used[index]);
  }
  return { ...source, positions, indices: new Uint32Array(indices) };
}
