import type { Geometry, WorldNode } from '@/scene/world/types';

export type Draw = {
  node: WorldNode;
  vertex: GPUBuffer;
  index: GPUBuffer;
  uniform: GPUBuffer;
  group: GPUBindGroup;
  count: number;
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
        overrides.set(key, { vertices, indices: geometry.indices });
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
        new Float32Array(vertex.getMappedRange()).set(geometry.vertices);
        vertex.unmap();
        const index = device.createBuffer({
          size: geometry.indices.byteLength,
          usage: GPUBufferUsage.INDEX,
          mappedAtCreation: true,
        });
        new Uint32Array(index.getMappedRange()).set(geometry.indices);
        index.unmap();
        shared = { vertex, index };
        buffers.set(geometry, shared);
      }
      const uniform = device.createBuffer({
        size: 160,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const group = device.createBindGroup({
        layout,
        entries: [{ binding: 0, resource: { buffer: uniform } }],
      });
      draws.set(node, { node, ...shared, uniform, group, count: geometry.indices.length });
    }
    node.children.forEach(visit);
  }
  try {
    visit(root);
  } catch (error) {
    for (const { vertex, index } of buffers.values()) {
      vertex.destroy();
      index.destroy();
    }
    for (const draw of draws.values()) draw.uniform.destroy();
    throw error;
  }
  return draws;
}

export function destroyDraws(draws: Map<WorldNode, Draw>) {
  const released = new Set<GPUBuffer>();
  for (const draw of draws.values()) {
    for (const buffer of [draw.vertex, draw.index, draw.uniform]) {
      if (!released.has(buffer)) buffer.destroy();
      released.add(buffer);
    }
  }
  draws.clear();
}
