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

const { carryPlayerView, createPlayerControls, updateMouseLook, updatePlayerView } =
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

test('same camera dialogue updates retain walking, looking and pointer capture state', () => {
  const game = state('mini_arrival');
  const first = world();
  const controls = createPlayerControls();
  updatePlayerView(controls, first, game, 0, true);
  controls.keys.add('w');
  updateMouseLook(controls, 45, -12);
  for (let i = 0; i < 20; i++) updatePlayerView(controls, first, game, 1 / 60, true);
  controls.dragging = true;
  controls.pointerId = 7;
  controls.lastPointer = [320, 240];
  const before = structuredClone({
    camera: first.camera,
    offset: controls.offset,
    velocity: controls.velocity,
    lookYaw: controls.lookYaw,
    lookPitch: controls.lookPitch,
  });
  const next = world();
  carryPlayerView(controls, first, next);
  assert.deepEqual(next.camera, before.camera);
  assert.deepEqual(controls.offset, before.offset);
  assert.deepEqual(controls.velocity, before.velocity);
  assert.equal(controls.lookYaw, before.lookYaw);
  assert.equal(controls.lookPitch, before.lookPitch);
  assert.equal(controls.dragging, true);
  assert.equal(controls.pointerId, 7);
  assert.deepEqual(controls.lastPointer, [320, 240]);
  assert.ok(controls.keys.has('w'));
  updatePlayerView(controls, next, game, 1 / 60, true);
  assert.ok(next.camera.eye[2] < before.camera.eye[2], 'walking continues through the dialogue');
});

test('a detail camera moves continuously and pauses at its currently displayed frame', () => {
  const game = state('mini_register');
  const first = world();
  const controls = createPlayerControls();
  updatePlayerView(controls, first, game, 0, true);
  const detail = world();
  detail.camera = { eye: [0.4, 1.2, 1.4], target: [0.2, 0.9, 0.5], fov: 46 };
  const destination = structuredClone(detail.camera);
  carryPlayerView(controls, first, detail);
  assert.deepEqual(detail.camera, first.camera, 'the first frame retains the visible camera');
  updatePlayerView(controls, detail, game, 1 / 60, true);
  assert.ok(detail.camera.eye[2] < first.camera.eye[2]);
  assert.ok(detail.camera.eye[2] > destination.eye[2]);
  const pausedCamera = structuredClone(detail.camera);
  for (let i = 0; i < 40; i++)
    updatePlayerView(controls, detail, { ...game, paused: true }, 1 / 60, false);
  assert.deepEqual(detail.camera, pausedCamera, 'pause cannot advance an authored camera move');
  for (let i = 0; i < 30; i++) updatePlayerView(controls, detail, game, 1 / 60, true);
  destination.eye.forEach((value, index) =>
    assert.ok(Math.abs(detail.camera.eye[index] - value) < 1e-9),
  );
  destination.target.forEach((value, index) =>
    assert.ok(Math.abs(detail.camera.target[index] - value) < 1e-9),
  );
  assert.equal(detail.camera.fov, destination.fov);
  assert.equal(controls.cameraBlend, undefined);
});

test('rapid camera updates continue from the displayed frame and unchanged shots keep their progress', () => {
  const game = state('mini_register');
  const first = world();
  const controls = createPlayerControls();
  updatePlayerView(controls, first, game, 0, true);
  const detail = world();
  detail.camera = { eye: [0.4, 1.2, 1.4], target: [0.2, 0.9, 0.5], fov: 46 };
  carryPlayerView(controls, first, detail);
  for (let i = 0; i < 8; i++) updatePlayerView(controls, detail, game, 1 / 60, true);
  const progress = controls.cameraBlend.elapsed;
  const unchanged = { camera: structuredClone(controls.baseCamera) };
  carryPlayerView(controls, detail, unchanged);
  assert.deepEqual(unchanged.camera, detail.camera);
  assert.equal(controls.cameraBlend.elapsed, progress);
  updatePlayerView(controls, unchanged, game, 1 / 60, true);
  assert.ok(controls.cameraBlend.elapsed > progress);

  const returnShot = world();
  const intermediate = structuredClone(unchanged.camera);
  carryPlayerView(controls, unchanged, returnShot);
  assert.deepEqual(returnShot.camera, intermediate, 'a new destination starts at the current view');
  updatePlayerView(controls, returnShot, game, 1 / 60, true);
  assert.ok(returnShot.camera.eye[2] > intermediate.eye[2]);
  assert.ok(returnShot.camera.eye[2] < first.camera.eye[2]);
});

test('a different physical scene still resets player movement and camera blending', () => {
  const first = world();
  const controls = createPlayerControls();
  updatePlayerView(controls, first, state('mini_arrival'), 0, true);
  updateMouseLook(controls, 45, -12);
  controls.offset = [0.2, -0.5];
  controls.dragging = true;
  controls.pointerId = 7;
  const destination = world();
  destination.camera = { eye: [0.3, 1.65, 4.8], target: [0, 1.15, -0.9], fov: 49 };
  updatePlayerView(controls, destination, state('mini_register'), 0, true);
  assert.equal(controls.lookYaw, 0);
  assert.equal(controls.lookPitch, 0);
  assert.deepEqual(controls.offset, [0, 0]);
  assert.equal(controls.dragging, false);
  assert.equal(controls.pointerId, undefined);
  assert.equal(controls.cameraBlend, undefined);
});
