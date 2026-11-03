import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mat4, vec3 } from 'wgpu-matrix';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three';

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
const { LISTEN_DOOR, LISTEN_CORRIDOR } =
  await import('../src/scene/world_environment/listen_room.ts');
const { createPlayerControls, updatePlayerView } =
  await import('../src/scene/world_view/player_controls.ts');
const { walkVolume } = await import('../src/scene/world_view/player_bounds.ts');
const actor = (id, portrait = id) => ({ id, portrait, name: id, visible: true, status: '' });
const state = (shotKey = 'listen_skin', companion = 'linlan') => ({
  sceneKey: 'mini_listen',
  shotKey,
  flags: { skin_seen: true, companion_present: true, vase_broken: shotKey === 'listen_vase' },
  actors: [
    actor(companion),
    actor('huipu'),
    actor('victim', companion === 'zhouyan' ? 'xuzhi' : 'zhouyan'),
  ],
  inventory: [],
  dialogue: { speaker: '', text: '' },
});

function matrices(root, time = 0) {
  const result = new Map();
  function visit(node, parent) {
    node.animate?.(time, 0);
    const local =
      node.matrix ||
      mat4.scale(
        mat4.rotateZ(
          mat4.rotateX(
            mat4.rotateY(mat4.translation(node.position), node.rotation[1]),
            node.rotation[0],
          ),
          node.rotation[2],
        ),
        node.scale,
      );
    const matrix = mat4.multiply(parent, local);
    result.set(node, matrix);
    node.children.forEach((child) => visit(child, matrix));
  }
  visit(root, mat4.identity());
  return result;
}

function roomMeshes(environment) {
  return [...matrices(environment)].flatMap(([node, matrix]) => {
    if (!node.geometry) return [];
    const positions = [];
    for (let offset = 0; offset < node.geometry.vertices.length; offset += 16)
      positions.push(
        ...vec3.transformMat4(node.geometry.vertices.subarray(offset, offset + 3), matrix),
      );
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(Array.from(node.geometry.indices));
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    mesh.name = node.name;
    return [mesh];
  });
}

function rayHits(meshes, from, to) {
  const eye = new Vector3(...from),
    target = new Vector3(...to);
  return new Raycaster(
    eye,
    target.clone().sub(eye).normalize(),
    0,
    eye.distanceTo(target) - 0.015,
  ).intersectObjects(meshes);
}

test('the door gap shows both people and their bed contact while the leaves occlude either side', () => {
  const world = createWorld({ state: state() });
  const meshes = roomMeshes(world.root.children.find((node) => node.name === 'listen'));
  const frame = matrices(world.root, 1);
  for (const identity of ['huipu', 'zhouyan']) {
    const root = world.root.children.find((node) => node.name === identity);
    const rig = root.skinTargets;
    const landmarks = identity === 'huipu' ? [rig.head, ...rig.hands] : [rig.head, rig.body];
    for (const landmark of landmarks) {
      // Test the face/upper torso surface: the anatomical centre can sit
      // inside the pillow even when the visible face clears it.
      const target = vec3.transformMat4(
        identity === 'zhouyan' ? [0, 0, 0.12] : [0, 0, 0],
        frame.get(landmark),
      );
      assert.equal(
        rayHits(meshes, world.camera.eye, target).length,
        0,
        `${identity} ${landmark.name} is hidden by architecture`,
      );
    }
  }
  for (const side of [-1, 1]) {
    const hits = rayHits(meshes, world.camera.eye, [
      LISTEN_DOOR.x + side * 1,
      1.4,
      LISTEN_DOOR.z - 0.5,
    ]);
    assert.ok(
      hits.some((hit) => hit.object.name === 'door_leaf'),
      `the ${side} leaf must frame the opening`,
    );
  }
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
});

test('each possible companion stays behind the player and outside the bedroom', () => {
  for (const companion of ['linlan', 'zhouyan', 'xuzhi']) {
    const world = createWorld({ state: state('listen_skin', companion) });
    const root = world.root.children.find((node) => node.name === companion);
    const start = [...root.position];
    for (const time of [0, 1, 5]) {
      root.animate(time, 1 / 60);
      assert.deepEqual(root.position, start);
      assert.ok(root.position[2] > LISTEN_DOOR.z + 0.5);
      const direction = vec3.subtract(world.camera.target, world.camera.eye);
      assert.ok(vec3.dot(vec3.subtract(root.position, world.camera.eye), direction) < 0);
    }
  }
});

test('movement stays in the exterior corridor after the reveal and every object close-up', () => {
  for (const shot of ['listen_skin', 'listen_vase', 'listen_cat', 'listen_bird']) {
    const game = state(shot),
      world = createWorld({ state: game });
    const base = structuredClone(world.camera),
      volume = walkVolume(game, base);
    assert.ok(base.eye[2] > LISTEN_DOOR.z + 0.5, `${shot} must start outside the doorway`);
    assert.ok(volume.z[0] + base.eye[2] > LISTEN_DOOR.z + 0.5);
    const controls = createPlayerControls();
    // Hold every cardinal and diagonal input long enough to reach the bounds,
    // then rotate and repeat so no camera-relative shortcut crosses the door.
    for (const keys of [['w'], ['a'], ['s'], ['d'], ['w', 'd'], ['w', 'a']]) {
      controls.keys = new Set(keys);
      controls.lookYaw += 0.72;
      for (let i = 0; i < 120; i++) {
        updatePlayerView(controls, world, game, 0.05, true);
        assert.ok(world.camera.eye[2] >= LISTEN_CORRIDOR.z[0] - 1e-6);
        assert.ok(world.camera.eye[2] <= LISTEN_CORRIDOR.z[1] + 1e-6);
        assert.ok(world.camera.eye[0] >= LISTEN_CORRIDOR.x[0] - 1e-6);
        assert.ok(world.camera.eye[0] <= LISTEN_CORRIDOR.x[1] + 1e-6);
      }
    }
  }
});
