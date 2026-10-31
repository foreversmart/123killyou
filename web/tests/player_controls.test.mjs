import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

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

const { createPlayerControls, updateMouseLook, updatePlayerView } =
  await import('../src/scene/world_view/player_controls.ts');

const state = (sceneKey) => ({ sceneKey, flags: {} });
const world = () => ({
  camera: { eye: [0, 1.7, 8.4], target: [0, 1.85, -1], fov: 49 },
});

test('WASD moves the authored camera and respects the arrival bounds', () => {
  const game = state('mini_arrival');
  const scene = world();
  const controls = createPlayerControls();
  controls.keys.add('w');
  updatePlayerView(controls, scene, game, 0.5, true);
  assert.ok(scene.camera.eye[2] < 8.4, 'forward input advances toward the temple');
  controls.keys.clear();
  controls.keys.add('s');
  for (let i = 0; i < 100; i++) updatePlayerView(controls, scene, game, 0.1, true);
  assert.ok(controls.offset[1] <= 4.5 && controls.offset[1] >= -4.5);
});

test('mouse look rotates the view while keeping the camera at the player position', () => {
  const scene = world();
  const controls = createPlayerControls();
  updateMouseLook(controls, 80, -20);
  updatePlayerView(controls, scene, state('mini_register'), 0, true);
  assert.notEqual(scene.camera.target[0], 0, 'horizontal mouse movement changes heading');
  assert.ok(scene.camera.eye[1] === 1.7, 'look does not float the player vertically');
});

test('corridor movement stops at the end wall and slides around the registration desk', () => {
  const corridor = world();
  corridor.camera.eye = [0, 1.68, 5.7];
  corridor.camera.target = [0, 1.3, -3.2];
  const controls = createPlayerControls();
  controls.keys.add('w');
  for (let i = 0; i < 500; i++)
    updatePlayerView(controls, corridor, state('mini_corridor_candle'), 1 / 60, true);
  assert.ok(controls.offset[1] >= -12.9, 'camera stays in front of the corridor end wall');

  const register = world();
  register.camera.eye = [0.3, 1.65, 4.8];
  register.camera.target = [0, 1.15, -0.9];
  const aroundDesk = createPlayerControls();
  aroundDesk.keys.add('a');
  aroundDesk.keys.add('w');
  for (let i = 0; i < 180; i++)
    updatePlayerView(aroundDesk, register, state('mini_register'), 1 / 60, true);
  assert.ok(Number.isFinite(register.camera.eye[0]) && Number.isFinite(register.camera.eye[2]));
  assert.ok(aroundDesk.offset[0] >= -3.8 && aroundDesk.offset[0] <= 3.8);
  assert.ok(aroundDesk.offset[1] >= -4.2 && aroundDesk.offset[1] <= 4.2);
});

test('pausing the story freezes input without snapping the player back to the authored shot', () => {
  const scene = world();
  const controls = createPlayerControls();
  controls.keys.add('w');
  for (let i = 0; i < 30; i++)
    updatePlayerView(controls, scene, state('mini_arrival'), 1 / 60, true);
  const beforePause = [...scene.camera.eye];
  updatePlayerView(controls, scene, state('mini_arrival'), 1, false);
  assert.deepEqual(scene.camera.eye, beforePause);
  updatePlayerView(controls, scene, state('mini_arrival'), 1 / 60, true);
  assert.ok(scene.camera.eye[2] < beforePause[2]);
});
