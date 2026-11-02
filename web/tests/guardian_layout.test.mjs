import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mat4, vec3 } from 'wgpu-matrix';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(
        new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href,
        context,
      );
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier))
      return nextResolve(specifier + '.ts', context);
    return nextResolve(specifier, context);
  },
});

const { createWorld } = await import('../src/scene/world/create_world.ts');
const { cameraMatrix } = await import('../src/scene/renderer/frame.ts');
const { guardianLampPositions } = await import('../src/scene/world_environment/shrine_details.ts');
const world = createWorld({
  mode: 'hall',
  state: {
    sceneKey: 'mini_refectory',
    shotKey: '',
    flags: {},
    actors: [],
    inventory: [],
    dialogue: { speaker: '', text: '' },
  },
});
const hall = world.root.children.find((child) => child.name === 'hall');
const kings = hall.children.filter((child) => child.name.startsWith('heavenly_king_'));
const assetRoot = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('library.json', assetRoot), 'utf8'));
const binary = readFileSync(new URL(manifest.binary, assetRoot));

function points(node, parent = mat4.identity()) {
  let matrix = mat4.translate(parent, node.position);
  matrix = mat4.rotateY(matrix, node.rotation[1]);
  matrix = mat4.rotateX(matrix, node.rotation[0]);
  matrix = mat4.rotateZ(matrix, node.rotation[2]);
  matrix = mat4.scale(matrix, node.scale);
  const range = node.asset && manifest.meshes[node.asset];
  const vertices =
    node.geometry?.vertices ||
    (range &&
      new Float32Array(binary.buffer, binary.byteOffset + range.vertexOffset, range.vertexCount));
  const result = [];
  if (vertices)
    for (let i = 0; i < vertices.length; i += 16)
      result.push([...vec3.transformMat4(vertices.subarray(i, i + 3), matrix)]);
  for (const child of node.children) result.push(...points(child, matrix));
  return result;
}

function bounds(vertices) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const point of vertices)
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  return { min, max };
}

function intersects(a, b) {
  return [0, 1, 2].every((axis) => a.max[axis] > b.min[axis] && b.max[axis] > a.min[axis]);
}

function firstObstruction(from, to, geometry) {
  const direction = vec3.subtract(to, from);
  let nearest = Infinity;
  for (let i = 0; i < geometry.indices.length; i += 3) {
    const vertex = (index) => geometry.vertices.subarray(index * 16, index * 16 + 3);
    const a = vertex(geometry.indices[i]);
    const edge = vec3.subtract(vertex(geometry.indices[i + 1]), a);
    const across = vec3.subtract(vertex(geometry.indices[i + 2]), a);
    const cross = vec3.cross(direction, across);
    const determinant = vec3.dot(edge, cross);
    if (Math.abs(determinant) < 0.00001) continue;
    const origin = vec3.subtract(from, a);
    const u = vec3.dot(origin, cross) / determinant;
    if (u < 0 || u > 1) continue;
    const q = vec3.cross(origin, edge);
    const v = vec3.dot(direction, q) / determinant;
    if (v < 0 || u + v > 1) continue;
    const t = vec3.dot(across, q) / determinant;
    if (t > 0.001 && t < 0.98) nearest = Math.min(nearest, t);
  }
  return nearest;
}

const kingPoints = kings.map((king) => points(king));
const kingBounds = kingPoints.map(bounds);

test('四大天王拥有独立法器实体，网格有限且索引有效', () => {
  assert.deepEqual(
    kings.map((king) => king.name).sort(),
    ['dragon', 'pipa', 'sword', 'umbrella'].map((kind) => `heavenly_king_${kind}`),
  );
  const attributeSizes = new Set();
  for (const king of kings) {
    const attribute = king.children.find((child) => child.name.endsWith('_hands_attribute'));
    assert.ok(attribute?.geometry.indices.length > 100, `${king.name} has a solid attribute`);
    attributeSizes.add(attribute.geometry.indices.length);
    for (const child of king.children) {
      const { vertices, indices } = child.geometry;
      assert.ok(vertices.every(Number.isFinite), child.name);
      assert.ok(
        indices.every((index) => index < vertices.length / 16),
        child.name,
      );
    }
  }
  assert.equal(attributeSizes.size, 4, '四种持物不能复用同一网格');
  const parasol = kingBounds[kings.findIndex((king) => king.name.endsWith('_umbrella'))];
  assert.ok(parasol.max[1] > 3.6, '宝伞伸过冠顶，保持完整伞盖');
});

test('天王和观音供台分开，伞盖与飘带不侵入两侧殿柱', () => {
  const altars = hall.children
    .filter((child) => child.name === 'bodhisattva')
    .map((node) => points(node))
    .map(bounds);
  for (let i = 0; i < kings.length; i++) {
    const box = kingBounds[i];
    assert.ok(box.min[0] > -4.44 && box.max[0] < 4.44, `${kings[i].name} clears columns`);
    assert.ok(box.min[2] > -4.2 && box.max[1] < 5.1, `${kings[i].name} clears the hall shell`);
    for (const altar of altars) assert.equal(intersects(box, altar), false, kings[i].name);
    for (let j = i + 1; j < kings.length; j++)
      assert.equal(intersects(box, kingBounds[j]), false, `${kings[i].name}/${kings[j].name}`);
  }
});

test('固定大殿镜头能容纳四尊完整轮廓，横屏和竖屏均保留冠顶及持物', () => {
  for (const aspect of [16 / 9, 4 / 3, 9 / 16]) {
    const matrix = cameraMatrix(world.camera, aspect);
    const projected = kingPoints.map((vertices) =>
      bounds(vertices.map((p) => vec3.transformMat4(p, matrix))),
    );
    for (let i = 0; i < projected.length; i++) {
      const box = projected[i];
      assert.ok(box.min[0] > -0.95 && box.max[0] < 0.95, `${kings[i].name} at ${aspect}`);
      assert.ok(box.min[1] > -0.85 && box.max[1] < 0.85, `${kings[i].name} at ${aspect}`);
      assert.ok(box.min[2] > 0 && box.max[2] < 1, 'statues are in front of the camera');
    }
    for (let i = 0; i < projected.length - 1; i++) {
      const a = projected[i],
        b = projected[i + 1];
      const overlap = Math.max(0, a.max[0] - b.min[0]);
      assert.ok(overlap < (b.max[0] - b.min[0]) * 0.15, '相邻天王不能遮住另一尊的主体');
    }
  }
});

test('低位铜灯避开天王裙甲，并为最靠后的过殿行走线留出身体宽度', () => {
  const lowBounds = kingPoints.map((vertices) => bounds(vertices.filter((p) => p[1] < 1.25)));
  for (const [x, , z] of guardianLampPositions) {
    assert.ok(-0.15 - z > 0.23 + 0.28, '油灯与许栀最靠后的行走线保持间隔');
    for (const box of lowBounds) {
      const dx = Math.max(box.min[0] - x, 0, x - box.max[0]);
      const dz = Math.max(box.min[2] - z, 0, z - box.max[2]);
      assert.ok(Math.hypot(dx, dz) > 0.23, `铜灯 ${x},${z} 距裙甲 ${Math.hypot(dx, dz)}m`);
    }
  }
});

test('大殿门扇和柱梁不挡住天王脸部及胸前持物', () => {
  for (const king of kings) {
    const matrix = mat4.rotateY(mat4.translation(king.position), king.rotation[1]);
    for (const local of [
      [0, 2.75, 0.3],
      [0, 1.85, 0.55],
    ]) {
      const target = vec3.transformMat4(local, matrix);
      const hit = firstObstruction(world.camera.eye, target, hall.geometry);
      assert.equal(hit, Infinity, `${king.name} 被殿体挡住，视线交点比例 ${hit}`);
    }
  }
});
