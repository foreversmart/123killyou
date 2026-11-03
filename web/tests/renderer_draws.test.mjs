import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(
        new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});
const { createDraws, destroyDraws } = await import('../src/scene/renderer/draws.ts');
const { node } = await import('../src/scene/world/types.ts');
globalThis.GPUBufferUsage = { VERTEX: 1, INDEX: 2, STORAGE: 4, UNIFORM: 8, COPY_DST: 16 };

function gpu() {
  const buffers = [];
  const groups = [];
  return {
    buffers,
    groups,
    createBuffer({ size }) {
      const data = new ArrayBuffer(size);
      const buffer = {
        destroyed: 0,
        getMappedRange: () => data,
        unmap() {},
        destroy() {
          this.destroyed++;
        },
      };
      buffers.push(buffer);
      return buffer;
    },
    createBindGroup(descriptor) {
      const group = { ...descriptor };
      groups.push(group);
      return group;
    },
  };
}
function geometry(value = 0) {
  const vertices = new Float32Array(48);
  vertices[0] = value;
  return { vertices, indices: new Uint32Array([0, 1, 2]) };
}
const world = (...children) => ({ ...node('world'), children });
const assetNode = (name, asset = 'person') => ({ ...node(name), asset });

test('equal rebuilt story meshes retain GPU buffers and bind groups, while rebinding live nodes', () => {
  const device = gpu();
  const first = node('table', geometry());
  let draws = createDraws(device, world(first), new Map(), {});
  const original = draws.get(first);
  const allocationCount = device.buffers.length;
  const next = node('table', geometry());
  next.position = [2, 0, 1];
  draws = createDraws(device, world(next), new Map(), {}, draws);
  assert.equal(device.buffers.length, allocationCount);
  assert.equal(draws.get(next).uniform, original.uniform);
  assert.equal(draws.get(next).group, original.group);
  assert.equal(draws.get(next).node, next);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 0));
  destroyDraws(draws);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 1));
});

test('adding and removing actors shares mesh storage and releases only unreferenced buffers', () => {
  const device = gpu();
  const mesh = geometry();
  mesh.skin = {
    joints: new Float32Array(12),
    weights: new Float32Array(12),
    skeleton: { bones: [{ name: 'root' }] },
  };
  const assets = new Map([['person', mesh]]);
  const first = assetNode('first');
  let draws = createDraws(device, world(first), assets, {});
  const original = draws.get(first);
  const second = assetNode('second');
  draws = createDraws(device, world(first, second), assets, {}, draws);
  const added = draws.get(second);
  assert.equal(added.vertex, original.vertex);
  assert.equal(added.index, original.index);
  assert.equal(added.influences, original.influences);
  assert.notEqual(added.bones, original.bones, 'each actor has independent pose storage');
  draws = createDraws(device, world(second), assets, {}, draws);
  assert.equal(original.uniform.destroyed, 1);
  assert.equal(original.bones.destroyed, 1);
  assert.equal(original.vertex.destroyed, 0);
  assert.equal(original.influences.destroyed, 0);
  destroyDraws(draws);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 1));
});

test('changed geometry, material and vegetation replace the affected draw without stale content', () => {
  const device = gpu();
  const stable = node('wall', geometry());
  const changed = node('candle', geometry());
  let draws = createDraws(device, world(stable, changed), new Map(), {});
  const wall = draws.get(stable);
  const original = draws.get(changed);
  const next = node('candle', geometry(2));
  next.surface = 'bronze';
  next.geometry.vegetation = new Float32Array([1, 2, 3, 4]);
  draws = createDraws(device, world(stable, next), new Map(), {}, draws);
  assert.equal(draws.get(stable).uniform, wall.uniform);
  assert.notEqual(draws.get(next).vertex, original.vertex);
  assert.equal(original.vertex.destroyed, 1);
  const vegetation = draws.get(next).storage[2];
  const third = node('candle', geometry(2));
  third.surface = 'bronze';
  third.geometry.vegetation = new Float32Array([4, 3, 2, 1]);
  draws = createDraws(device, world(stable, third), new Map(), {}, draws);
  assert.notEqual(draws.get(third).storage[2], vegetation);
  assert.equal(vegetation.destroyed, 1);
  destroyDraws(draws);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 1));
});

test('failed updates preserve the previous scene and release every newly allocated buffer', () => {
  const device = gpu();
  const originalNode = node('wall', geometry());
  const original = createDraws(device, world(originalNode), new Map(), {});
  const allocatedBefore = device.buffers.length;
  const replacement = node('wall', geometry(8));
  assert.throws(
    () =>
      createDraws(
        device,
        world(replacement, assetNode('missing', 'missing')),
        new Map(),
        {},
        original,
      ),
    /缺少场景模型/,
  );
  assert.equal(original.get(originalNode).node, originalNode);
  assert.ok(device.buffers.slice(0, allocatedBefore).every((buffer) => buffer.destroyed === 0));
  assert.ok(device.buffers.slice(allocatedBefore).every((buffer) => buffer.destroyed === 1));
  destroyDraws(original);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 1));
});

test('bind group failures do not invalidate retained bindings or leak partially built draws', () => {
  const device = gpu();
  const originalNode = node('wall', geometry());
  const original = createDraws(device, world(originalNode), new Map(), {});
  const allocatedBefore = device.buffers.length;
  device.createBindGroup = () => {
    throw new Error('bind group failure');
  };
  assert.throws(
    () =>
      createDraws(
        device,
        world(node('wall', geometry()), node('extra', geometry(2))),
        new Map(),
        {},
        original,
      ),
    /bind group failure/,
  );
  assert.ok(device.buffers.slice(0, allocatedBefore).every((buffer) => buffer.destroyed === 0));
  assert.ok(device.buffers.slice(allocatedBefore).every((buffer) => buffer.destroyed === 1));
  destroyDraws(original);
  assert.ok(device.buffers.every((buffer) => buffer.destroyed === 1));
});
