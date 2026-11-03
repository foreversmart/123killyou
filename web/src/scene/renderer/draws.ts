import type { Geometry, WorldNode } from '@/scene/world/types';
import { sameGeometry } from '@/scene/renderer/geometry_identity';

export type Draw = {
  node: WorldNode;
  vertex: GPUBuffer;
  index: GPUBuffer;
  uniform: GPUBuffer;
  group: GPUBindGroup;
  count: number;
  bones?: GPUBuffer;
  influences?: GPUBuffer;
  /** Includes shared dummy bindings so all storage is released with the world. */
  storage: GPUBuffer[];
};
type Shared = {
  source: Geometry;
  surface?: WorldNode['surface'];
  vertex: GPUBuffer;
  index: GPUBuffer;
  count: number;
  vegetation: GPUBuffer;
  influences?: GPUBuffer;
};
const identities = new WeakMap<Draw, { path: string; shared: Shared }>();
const drawBuffers = (draw: Draw) => [draw.vertex, draw.index, draw.uniform, ...draw.storage];

/** Replace a world atomically, retaining unchanged meshes and their GPU bindings. */
export function createDraws(
  device: GPUDevice,
  root: WorldNode,
  assets: Map<string, Geometry>,
  layout: GPUBindGroupLayout,
  previous = new Map<WorldNode, Draw>(),
) {
  const draws = new Map<WorldNode, Draw>();
  const oldByPath = new Map<string, Draw>();
  const pool = new Map<Geometry, Map<string, Shared>>();
  const allocated = new Set<GPUBuffer>();
  let dummy: [GPUBuffer, GPUBuffer] | undefined;
  let emptyVegetation: GPUBuffer | undefined;
  function remember(source: Geometry, shared: Shared) {
    let variants = pool.get(source);
    if (!variants) pool.set(source, (variants = new Map()));
    variants.set(shared.surface || '', shared);
  }
  for (const draw of previous.values()) {
    const identity = identities.get(draw);
    if (!identity) continue;
    oldByPath.set(identity.path, draw);
    remember(identity.shared.source, identity.shared);
    if (!draw.bones) dummy ??= [draw.storage[0], draw.storage[1]];
    if (!identity.shared.source.vegetation) emptyVegetation ??= draw.storage[2];
  }
  function buffer(data: Float32Array | Uint32Array, usage: number) {
    const result = device.createBuffer({
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    });
    allocated.add(result);
    new Uint8Array(result.getMappedRange()).set(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
    result.unmap();
    return result;
  }
  function storage(data: Float32Array, writable = false) {
    return buffer(data, GPUBufferUsage.STORAGE | (writable ? GPUBufferUsage.COPY_DST : 0));
  }
  function geometryBuffers(source: Geometry, surface?: WorldNode['surface']): Shared {
    const cached = pool.get(source)?.get(surface || '');
    if (cached) return cached;
    let vertices = source.vertices;
    if (surface) {
      vertices = vertices.slice();
      for (let i = 0; i < vertices.length; i += 16)
        vertices.set(
          surface === 'bronze'
            ? [0.42, 0.27, 0.085, 0.37, 0.78, 5]
            : [0.24, 0.26, 0.22, 0.91, 0, 4],
          i + 6,
        );
    }
    const shared: Shared = {
      source,
      surface,
      vertex: buffer(vertices, GPUBufferUsage.VERTEX),
      index: buffer(source.indices, GPUBufferUsage.INDEX),
      count: source.indices.length,
      vegetation: source.vegetation
        ? storage(source.vegetation)
        : (emptyVegetation ??= storage(new Float32Array(4))),
    };
    if (source.skin) {
      const count = vertices.length / 16;
      const data = new Float32Array(count * 8);
      for (let vertex = 0; vertex < count; vertex++) {
        data.set(source.skin.joints.subarray(vertex * 4, vertex * 4 + 4), vertex * 8);
        data.set(source.skin.weights.subarray(vertex * 4, vertex * 4 + 4), vertex * 8 + 4);
      }
      shared.influences = storage(data);
    }
    remember(source, shared);
    return shared;
  }
  function skinBindings(shared: Shared, node: WorldNode) {
    if (!shared.source.skin) {
      dummy ??= [storage(new Float32Array(16)), storage(new Float32Array(8))];
      return { entries: dummy };
    }
    const matrices =
      node.skinMatrices?.slice() || new Float32Array(shared.source.skin.skeleton.bones.length * 16);
    if (!node.skinMatrices)
      for (let bone = 0; bone < matrices.length; bone += 16)
        for (let axis = 0; axis < 4; axis++) matrices[bone + axis * 5] = 1;
    const bones = storage(matrices, true);
    return { entries: [bones, shared.influences!], bones, influences: shared.influences };
  }
  function visit(node: WorldNode, path: string) {
    if (node.asset?.startsWith('tidewater_')) return;
    const source = node.asset ? assets.get(node.asset) : node.geometry;
    if (node.asset && !source) throw new Error('缺少场景模型：' + node.asset + '，请重新载入。');
    if (source?.indices.length) {
      const old = oldByPath.get(path);
      const prior = old && identities.get(old);
      let draw: Draw;
      let shared: Shared;
      if (
        old &&
        prior &&
        prior.shared.surface === node.surface &&
        sameGeometry(prior.shared.source, source)
      ) {
        shared = prior.shared;
        remember(source, shared);
        draw = { ...old, node };
      } else {
        shared = geometryBuffers(source, node.surface);
        const uniform = device.createBuffer({
          size: 160,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        allocated.add(uniform);
        const skin = skinBindings(shared, node);
        const group = device.createBindGroup({
          layout,
          entries: [
            { binding: 0, resource: { buffer: uniform } },
            { binding: 1, resource: { buffer: skin.entries[0] } },
            { binding: 2, resource: { buffer: skin.entries[1] } },
            { binding: 3, resource: { buffer: shared.vegetation } },
          ],
        });
        draw = {
          node,
          vertex: shared.vertex,
          index: shared.index,
          count: shared.count,
          uniform,
          group,
          bones: skin.bones,
          influences: skin.influences,
          storage: [...skin.entries, shared.vegetation],
        };
      }
      identities.set(draw, { path, shared });
      draws.set(node, draw);
    }
    const occurrences = new Map<string, number>();
    for (const child of node.children) {
      const index = occurrences.get(child.name) || 0;
      occurrences.set(child.name, index + 1);
      visit(child, path + '/' + encodeURIComponent(child.name) + ':' + index);
    }
  }
  try {
    visit(root, encodeURIComponent(root.name));
  } catch (error) {
    for (const item of allocated) item.destroy();
    throw error;
  }
  const retained = new Set([...draws.values()].flatMap(drawBuffers));
  const retired = new Set([...previous.values()].flatMap(drawBuffers));
  for (const item of retired) if (!retained.has(item)) item.destroy();
  return draws;
}

export function destroyDraws(draws: Map<WorldNode, Draw>) {
  const released = new Set([...draws.values()].flatMap(drawBuffers));
  for (const buffer of released) buffer.destroy();
  draws.clear();
}
