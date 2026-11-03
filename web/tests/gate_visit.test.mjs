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
    return nextResolve(specifier, context);
  },
});

const { gateVisitPose } = await import('../src/scene/world/gate_visit.ts');
const { actorPositions, cameras } = await import('../src/scene/world/placement.ts');
const { createDistanceGait } = await import('../src/scene/world_character/distance_gait.ts');
const { visualKey } = await import('../src/scene/world/visual_key.ts');
const { performanceKey } = await import('../src/scene/world/performance_key.ts');
const { addInvestigation } = await import('../src/scene/world/investigations.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
const { applyDetailCamera } = await import('../src/scene/world/details.ts');
const { createPlayerControls, updatePlayerView } =
  await import('../src/scene/world_view/player_controls.ts');

const ids = ['linlan', 'zhouyan', 'xuzhi', 'luchen'];
const game = {
  sceneKey: 'mini_arrival',
  room: 'gate',
  shotKey: 'arrival_gate',
  flags: {},
  actors: ids.map((id) => ({ id, name: id, portrait: id, visible: true })),
};
const angle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

test('several complete visits preserve speed, heading, personal space and planted feet at stops', () => {
  const tracks = ids.map((id) => {
    const base = actorPositions.gate[id];
    return {
      id,
      base,
      previous: gateVisitPose(id, 0, base),
      gait: createDistanceGait(base),
      stopped: 0,
      walking: 0,
    };
  });
  for (let frame = 1; frame <= 180 * 60; frame++) {
    const time = frame / 60;
    for (const track of tracks) {
      const pose = gateVisitPose(track.id, time, track.base);
      const dx = pose.position[0] - track.previous.position[0];
      const dz = pose.position[2] - track.previous.position[2];
      const distance = Math.hypot(dx, dz);
      const gait = track.gait(pose.position, time);
      assert.ok(distance < 0.012, `${track.id} cannot jump between path segments or loop seams`);
      assert.ok(
        Math.abs(angle(track.previous.facing, pose.facing)) < 0.026,
        `${track.id} turns continuously at the slower observation and departure pace`,
      );
      assert.equal(
        pose.position[1],
        track.base[1],
        'routes remain on their own level of the forecourt',
      );
      if (distance > 0.002) {
        track.walking++;
        assert.ok(gait.weight > 0, 'actual travel lifts a foot');
        assert.ok(
          Math.abs(angle(pose.facing, Math.atan2(dx, dz))) < 0.001,
          'feet walk forward along the route',
        );
      } else if (distance === 0 && gait.weight === 0) track.stopped++;
      track.previous = pose;
    }
    for (let a = 0; a < tracks.length; a++)
      for (let b = a + 1; b < tracks.length; b++) {
        const first = tracks[a].previous.position;
        const second = tracks[b].previous.position;
        assert.ok(
          Math.hypot(first[0] - second[0], first[2] - second[2]) > 0.7,
          'visitors never walk through one another',
        );
      }
  }
  for (const track of tracks) {
    assert.ok(track.walking > 300, `${track.id} keeps visiting after the opening lines`);
    assert.ok(
      track.stopped > 1200,
      `${track.id} has real standing observation time without stepping`,
    );
  }
});

test('all opening dialogue and investigations reuse the world, timeline and player view', () => {
  const key = visualKey(game, 'story');
  const action = performanceKey(game, 'story');
  const world = {
    camera: structuredClone(cameras.gate),
    hotspots: [
      { id: 'cat', position: [-3, 0.18, 0.5] },
      { id: 'plaque', position: [-3.9, 1.6, -1.9] },
    ],
  };
  const controls = createPlayerControls();
  updatePlayerView(controls, world, game, 0, false);
  controls.lookYaw = 0.25;
  controls.offset = [0.2, 0.3];
  updatePlayerView(controls, world, game, 0, false);
  const view = structuredClone(world.camera);
  for (const shotKey of [
    'arrival_unload',
    'arrival_gate_beauty',
    'arrival_weather',
    'arrival_zhouyan',
    'arrival_luchen',
    'arrival_inner',
    'arrival_plaque',
    'arrival_cat',
    'register_camera_bell',
    'register_drag_mark',
    'register_ribbon',
    'room_beads',
  ]) {
    const next = {
      ...game,
      shotKey,
      flags: { gate_seen: true, cat_call_heard: true, arrival_intro_linlan: true },
      dialogue: { speaker: '林岚', text: '这座寺庙真漂亮。' },
    };
    assert.equal(visualKey(next, 'story'), key, `${shotKey} reuses geometry and rigs`);
    assert.equal(performanceKey(next, 'story'), action, `${shotKey} keeps the visit clock`);
    assert.deepEqual(
      next.actors.map((actor) => performanceFor(actor, next)),
      ['camera', 'admire', 'glance', 'welcome'],
      'restoring an observation cannot replace the visit with an interior action',
    );
    applyDetailCamera(world, next);
    addInvestigation(world, next);
    updatePlayerView(controls, world, next, 0, false);
    assert.deepEqual(world.camera, view, `${shotKey} preserves the player's view`);
  }
  assert.notEqual(
    visualKey({ ...game, sceneKey: 'mini_register' }, 'story'),
    key,
    'leaving the gate still loads the next room',
  );
});
