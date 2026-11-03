import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

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

const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { identities } = await import('../src/scene/world_character/identity.ts');
const { createWorld } = await import('../src/scene/world/create_world.ts');
const { extractZipEntry } = await import('../src/shared/lib/zip.ts');
const { parseBlenderAnimations, applyBlenderPose } =
  await import('../src/scene/world_character/blender_action_library.ts');
const archive = await readFile(new URL('../public/art/world/npc_rigged.zip', import.meta.url));
const animations = parseBlenderAnimations(
  await extractZipEntry(
    archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
  ),
);
const actor = (id, portrait = id) => ({
  id,
  name: id,
  portrait,
  visible: true,
  position: '',
  status: '',
});
const guests = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
const state = (sceneKey = 'mini_arrival', shotKey = 'arrival_gate', actors = guests) => ({
  sceneKey,
  shotKey,
  actors,
  flags: {},
  inventory: [],
  dialogue: { speaker: '', text: '' },
});
const legsOf = (root) => root.blenderTargets.legs;
const legPose = (root) =>
  legsOf(root).map((leg) => [...leg.position, ...leg.rotation, leg.bend.angle]);
const legMotion = (root) =>
  Math.max(...legsOf(root).map((leg) => Math.abs(leg.rotation[0]) + Math.abs(leg.bend.angle)));
const placementPose = (root) => [...root.position, ...root.rotation, ...legPose(root).flat()];
function frame(root, time) {
  root.animate(time, 1 / 60);
  if (root.blenderEnabled && root.blenderAction)
    applyBlenderPose(root.blenderAction, time, animations, root.blenderTargets);
}
function walkingRig(id = 'linlan') {
  const rig = characterModel(id);
  animateCharacter(rig, actor(id), state('mini_register', 'travel'), {
    traveling: true,
    walkDuration: 30,
  });
  return rig;
}
function walk(distance, duration = 2, fps = 60) {
  const { root } = walkingRig();
  let peak = 0,
    swings = 0,
    lastSide = 0;
  frame(root, 0);
  for (let i = 1; i <= duration * fps; i++) {
    root.position[2] = (distance * i) / (duration * fps);
    frame(root, i / fps);
    peak = Math.max(peak, legMotion(root));
    const [right, left] = legsOf(root);
    const side = Math.sign(right.bend.angle - left.bend.angle);
    if (side && side !== lastSide) {
      swings++;
      lastSide = side;
    }
  }
  return { root, peak, swings };
}

test('every identity keeps its feet planted without translation and lifts them when moving', () => {
  for (const id of Object.keys(identities)) {
    const { root } = walkingRig(id);
    root.blenderEnabled = true;
    frame(root, 0);
    const standing = legPose(root);
    for (const time of [0.25, 1, 2]) {
      root.rotation[1] += 0.2;
      root.position[1] += 0.01;
      frame(root, time);
      assert.deepEqual(legPose(root), standing, `${id}: turning and vertical motion are not steps`);
    }
    let peak = 0;
    for (let i = 1; i <= 60; i++) {
      root.position[0] = i / 60;
      frame(root, 2 + i / 60);
      peak = Math.max(peak, legMotion(root));
    }
    assert.ok(peak > 0.05, `${id} lifts a leg during horizontal travel`);
  }
});

test('short shifts use smaller lifts and fewer alternating steps than longer walks', () => {
  const short = walk(0.05);
  const long = walk(2.4);
  assert.ok(short.peak > 0, 'even a five-centimetre shift has a foot lift');
  assert.ok(short.peak < long.peak * 0.4, `${short.peak} versus ${long.peak}`);
  assert.ok(short.swings < long.swings, `${short.swings} versus ${long.swings} swings`);
  assert.ok(long.swings >= 4, 'both feet alternate over a longer path');
});

test('the same travelled path advances the same gait regardless of duration or frame rate', () => {
  const runs = [walk(1.7, 2, 30), walk(1.7, 2, 120), walk(1.7, 8, 60)];
  for (const { root, swings } of runs) {
    assert.ok(Math.abs(root.gait.distance - 1.7) < 1e-9);
    assert.ok(Math.abs(root.gait.phase - runs[0].root.gait.phase) < 1e-9);
    assert.equal(swings, runs[0].swings, 'slowing the root cannot add extra steps');
  }
  assert.ok(runs[2].peak < runs[0].peak, 'slow travel uses a more restrained lift');
});

test('sub-millimetre frame displacement still produces a proportional foot lift', () => {
  const slow = walk(0.003, 2, 120);
  assert.ok(slow.peak > 0, 'tiny per-frame displacement must not be thresholded away');
  assert.ok(slow.peak < walk(0.3).peak);
  assert.ok(Math.abs(slow.root.gait.distance - 0.003) < 1e-10);
});

test('pause freezes the feet; a real stop settles them and resuming travel starts a new lift', () => {
  const { root } = walkingRig();
  frame(root, 0);
  root.position[2] = 0.23;
  frame(root, 0.4);
  assert.ok(legMotion(root) > 0);
  const paused = legPose(root);
  const phase = root.gait.phase;
  frame(root, 0.4);
  assert.deepEqual(legPose(root), paused, 'a frozen scene clock keeps the same foot pose');
  const airborne = legMotion(root);
  frame(root, 0.42);
  assert.ok(
    legMotion(root) > airborne * 0.9,
    'the raised foot does not snap down on the stop frame',
  );
  assert.equal(root.gait.moving, false, 'the landing is not another traveling step');
  for (const time of [0.46, 0.5, 0.56, 0.58]) {
    const before = legMotion(root);
    frame(root, time);
    assert.ok(legMotion(root) <= before, 'stopping only lowers the airborne foot');
    assert.equal(root.gait.phase, phase, 'standing cannot start another stride');
  }
  assert.equal(legMotion(root), 0, 'both feet finish their short landing');
  assert.equal(root.gait.phase, phase, 'standing cannot advance the gait');
  root.position[0] += 0.03;
  frame(root, 0.6);
  assert.ok(legMotion(root) > 0, 'reversing or stepping sideways resumes the gait');
});

test('ordinary walking swings the opposite arm with the advancing leg', () => {
  const rig = characterModel('xuzhi');
  animateCharacter(rig, actor('xuzhi'), state('mini_refectory', 'refectory_table'), {
    traveling: true,
  });
  frame(rig.root, 0);
  for (let i = 1; i <= 80; i++) {
    rig.root.position[2] = i / 100;
    frame(rig.root, i / 60);
    for (const side of [0, 1]) {
      const thigh = rig.legs[side].rotation[0];
      const shoulder = rig.arms[side].rotation[0] + 0.08;
      assert.ok(
        thigh * shoulder <= 0,
        'same-side arm counters the leg instead of marching with it',
      );
    }
  }
});

test('actual routes lift both feet with Blender enabled and settle at route endpoints', () => {
  const cases = [
    ['mini_arrival', 'arrival_gate', 'story', guests],
    ['mini_arrival', 'arrival_gate', 'alighting', guests],
    ['mini_register', 'register_desk', 'travel', guests],
    ['mini_refectory', 'refectory_table', 'travel', guests],
    ['mini_refectory', 'refectory_table', 'hall', guests],
    ['mini_corridor_candle', 'corridor_candles', 'travel', guests],
    ['mini_ending', 'ending_departure', 'travel', guests],
    ['mini_double', 'double_exit', 'story', [actor('skin_double', 'linlan')]],
  ];
  for (const [sceneKey, shotKey, mode, actors] of cases) {
    const world = createWorld({ state: state(sceneKey, shotKey, actors), mode });
    const roots = world.root.children.filter((node) => node.blenderTargets);
    assert.equal(roots.length, actors.length);
    for (const root of roots) {
      root.blenderEnabled = true;
      frame(root, 0);
      const start = [...root.position];
      const peaks = [0, 0];
      const frames = sceneKey === 'mini_arrival' && mode === 'story' ? 510 : 300;
      for (let i = 1; i <= frames; i++) {
        frame(root, i / 30);
        if (i === 9) {
          const paused = placementPose(root);
          frame(root, i / 30);
          frame(root, i / 30);
          assert.deepEqual(placementPose(root), paused, `${sceneKey}/${mode} freezes in place`);
        }
        legsOf(root).forEach((leg, side) => {
          peaks[side] = Math.max(peaks[side], Math.abs(leg.bend.angle));
        });
      }
      const label = `${sceneKey}/${mode}/${root.name}`;
      if (sceneKey === 'mini_ending' && root.name === 'luchen') {
        assert.deepEqual(root.position, start, label);
        assert.deepEqual(peaks, [0, 0], label);
      } else {
        assert.ok(root.gait.distance > 0, `${label} covers real ground`);
        assert.ok(
          peaks.some((peak) => peak > 0.005),
          `${label}: lifts ${peaks}`,
        );
        if (root.gait.distance > 1)
          assert.ok(
            peaks.every((peak) => peak > 0.005),
            `${label}: alternates both feet`,
          );
      }
      if (mode !== 'story' || sceneKey === 'mini_double') {
        frame(root, 30);
        frame(root, 31);
        assert.equal(legMotion(root), 0, `${label} stops stepping at its endpoint`);
      }
    }
  }
});

test('continuity assigned after world creation blends from the visible position and drives steps', () => {
  const outgoing = createWorld({ state: state() }).root.children.find(
    (node) => node.name === 'linlan',
  );
  for (let i = 0; i <= 600; i++) frame(outgoing, i / 60);
  const world = createWorld({ state: state() });
  const root = world.root.children.find((node) => node.name === 'linlan');
  const from = [...outgoing.position];
  root.animationContinuity = {
    position: from,
    rotationY: outgoing.rotation[1],
    time: 10,
    gait: outgoing.gait,
  };
  frame(root, 10);
  assert.deepEqual(root.position, from, 'the first frame preserves the outgoing shot position');
  assert.equal(root.gait.phase, outgoing.gait.phase, 'shot rebuild keeps the ongoing step');
  assert.deepEqual(legPose(root), legPose(outgoing), 'both feet keep their outgoing pose');
  const paused = placementPose(root);
  frame(root, 10);
  assert.deepEqual(placementPose(root), paused, 'pausing also freezes a continuity handoff');
  frame(root, 10.1);
  assert.ok(root.gait.moving);
  assert.ok(root.gait.phase > outgoing.gait.phase, 'continued movement advances the carried step');
  assert.ok(legMotion(root) > 0, 'the visible blended movement gets a foot lift');
  frame(root, 10.5);
  assert.equal(root.animationContinuity, undefined);
});
