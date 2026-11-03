import type { Geometry, WorldNode } from '@/scene/world/types';

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

export function createDraws(
  device: GPUDevice,
  root: WorldNode,
  assets: Map<string, Geometry>,
  layout: GPUBindGroupLayout,
) {
  const draws = new Map<WorldNode, Draw>();
  const buffers = new Map<Geometry, { vertex: GPUBuffer; index: GPUBuffer }>();
  const overrides = new Map<string, Geometry>();
  const allocated = new Set<GPUBuffer>();
  const influences = new Map<Geometry, GPUBuffer>();
  let dummy: [GPUBuffer, GPUBuffer] | undefined;
  function storageBuffer(data: Float32Array, writable = false) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | (writable ? GPUBufferUsage.COPY_DST : 0),
      mappedAtCreation: true,
    });
    allocated.add(buffer);
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  }
  function skinBindings(geometry: Geometry, node: WorldNode) {
    if (!geometry.skin) {
      dummy ??= [storageBuffer(new Float32Array(16)), storageBuffer(new Float32Array(8))];
      return { entries: dummy };
    }
    let influence = influences.get(geometry);
    if (!influence) {
      const count = geometry.vertices.length / 16;
      const data = new Float32Array(count * 8);
      for (let vertex = 0; vertex < count; vertex++) {
        data.set(geometry.skin.joints.subarray(vertex * 4, vertex * 4 + 4), vertex * 8);
        data.set(geometry.skin.weights.subarray(vertex * 4, vertex * 4 + 4), vertex * 8 + 4);
      }
      influence = storageBuffer(data);
      influences.set(geometry, influence);
    }
    const matrices =
      node.skinMatrices?.slice() || new Float32Array(geometry.skin.skeleton.bones.length * 16);
    if (!node.skinMatrices)
      for (let bone = 0; bone < matrices.length; bone += 16)
        for (let axis = 0; axis < 4; axis++) matrices[bone + axis * 5] = 1;
    const bones = storageBuffer(matrices, true);
    return { entries: [bones, influence], bones, influences: influence };
  }
  function visit(node: WorldNode) {
    let geometry = node.asset ? assets.get(node.asset) : node.geometry;
    if (node.asset && !geometry) throw new Error('缺少场景模型：' + node.asset + '，请重新载入。');
    if (geometry && node.surface) {
      const key = node.asset + ':' + node.surface;
      if (!overrides.has(key)) {
        const vertices = geometry.vertices.slice();
        const bronze = node.surface === 'bronze';
        for (let i = 0; i < vertices.length; i += 16) {
          vertices.set(
            bronze ? [0.42, 0.27, 0.085, 0.37, 0.78, 5] : [0.24, 0.26, 0.22, 0.91, 0, 4],
            i + 6,
          );
        }
        overrides.set(key, { ...geometry, vertices });
      }
      geometry = overrides.get(key);
    }
    if (geometry?.indices.length) {
      let shared = buffers.get(geometry);
      if (!shared) {
        const vertex = device.createBuffer({
          size: geometry.vertices.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        allocated.add(vertex);
        new Float32Array(vertex.getMappedRange()).set(geometry.vertices);
        vertex.unmap();
        const index = device.createBuffer({
          size: geometry.indices.byteLength,
          usage: GPUBufferUsage.INDEX,
          mappedAtCreation: true,
        });
        allocated.add(index);
        new Uint32Array(index.getMappedRange()).set(geometry.indices);
        index.unmap();
        shared = { vertex, index };
        buffers.set(geometry, shared);
      }
      const uniform = device.createBuffer({
        size: 160,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      allocated.add(uniform);
      const skin = skinBindings(geometry, node);
      const group = device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: uniform } },
          { binding: 1, resource: { buffer: skin.entries[0] } },
          { binding: 2, resource: { buffer: skin.entries[1] } },
        ],
      });
      draws.set(node, {
        node,
        ...shared,
        uniform,
        group,
        count: geometry.indices.length,
        bones: skin.bones,
        influences: skin.influences,
        storage: skin.entries,
      });
    }
    node.children.forEach(visit);
  }
  try {
    visit(root);
  } catch (error) {
    for (const buffer of allocated) buffer.destroy();
    throw error;
  }
  return draws;
}

export function destroyDraws(draws: Map<WorldNode, Draw>) {
  const released = new Set<GPUBuffer>();
  for (const draw of draws.values()) {
    for (const buffer of [draw.vertex, draw.index, draw.uniform, ...draw.storage]) {
      if (!released.has(buffer)) buffer.destroy();
      released.add(buffer);
    }
  }
  draws.clear();
}
