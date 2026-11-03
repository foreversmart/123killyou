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
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { createWorld } = await import('../src/scene/world/create_world.ts');
const { isActorSpeaking } = await import('../src/scene/world_character/speech.ts');
const { visualKey } = await import('../src/scene/world/visual_key.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
const { mealLift, mealHandTarget, mealUtensilRotation } =
  await import('../src/scene/world_character/day_actions.ts');
const { setup: setupSkinned, bonePoint } = await import('./skinned_character_fixture.mjs');
const actor = (id, name = id) => ({ id, name, portrait: id, visible: true });
const state = (shotKey, actors = []) => ({
  sceneKey: shotKey.startsWith('register_')
    ? 'mini_register'
    : shotKey.startsWith('refectory_')
      ? 'mini_refectory'
      : 'mini_arrival',
  shotKey,
  actors,
  flags: {},
  inventory: [],
  dialogue: { speaker: '', text: '' },
});

test('opening dialogue and investigation keep rigs; cast and place changes rebuild them', () => {
  const game = state('arrival_gate', [actor('linlan')]);
  const key = visualKey(game, 'story');
  assert.equal(
    key,
    visualKey(
      {
        ...game,
        paused: true,
        savedAt: 'saved',
        inventory: [{ id: 'key' }],
        dialogue: { speaker: '林岚', text: '新一句对白' },
      },
      'story',
    ),
  );
  assert.equal(key, visualKey({ ...game, shotKey: 'arrival_weather' }, 'story'));
  assert.equal(key, visualKey({ ...game, flags: { gate_seen: true } }, 'story'));
  for (const update of [
    { actors: [{ ...game.actors[0], visible: false }] },
    { actors: [{ ...game.actors[0], portrait: 'xuzhi' }] },
  ])
    assert.notEqual(key, visualKey({ ...game, ...update }, 'story'));
  assert.notEqual(key, visualKey(game, 'travel'));
});

test('admiring the gate tilts and scans the head; the camera rises with both arms', () => {
  const admirer = characterModel('zhouyan');
  animateCharacter(admirer, actor('zhouyan'), state('arrival_gate_beauty'));
  admirer.root.animate(0, 0);
  const first = [...admirer.head.rotation];
  admirer.root.animate(1.5, 0);
  assert.ok(admirer.head.rotation[0] < first[0] - 0.2);
  assert.ok(admirer.head.rotation[1] > first[1] + 0.2);
  for (const [shot, raised] of [
    ['arrival_weather', true],
    ['dawn_courtyard', false],
  ]) {
    const { rig, frame } = setupSkinned('standing', shot);
    frame(0);
    const heights = ['R', 'L'].map((side) => bonePoint(rig, 'hand.' + side)[1]);
    frame(2);
    for (const [index, side] of ['R', 'L'].entries())
      assert.ok(bonePoint(rig, 'hand.' + side)[1] > heights[index] + (raised ? 0.35 : 0.1));
    assert.ok(
      rig.elbows.every((joint) => joint.rotation[0] < 0),
      'elbows fold toward the camera grip',
    );
    assert.equal(Math.sign(rig.head.rotation[0]), raised ? -1 : 1);
    assert.equal(rig.root.skinTargets.mesh.asset, 'linlan_model_skin');
    assert.equal(rig.body.children.filter((node) => node.name === 'held_camera').length, 0);
  }
});

test('arrival gestures settle into a follow-up observation instead of looping the same pose', () => {
  const admirer = characterModel('zhouyan');
  animateCharacter(admirer, actor('zhouyan'), state('arrival_gate_beauty'));
  admirer.root.animate(1.5, 0);
  const scan = admirer.head.rotation[1];
  admirer.root.animate(6.5, 0);
  const settled = admirer.head.rotation[1];
  assert.ok(Math.abs(settled) < Math.abs(scan), 'the full scan settles on the eave');

  const photographer = setupSkinned('standing', 'arrival_weather');
  photographer.frame(2);
  const raised = bonePoint(photographer.rig, 'hand.R')[1];
  photographer.frame(4);
  const lowered = bonePoint(photographer.rig, 'hand.R');
  assert.ok(
    lowered[1] < raised - 0.15,
    'the hands lower the source camera after checking the frame',
  );
  assert.ok(
    lowered[1] > photographer.rig.body.position[1] + 0.1,
    'the grip remains above the waist',
  );
});

test('arrival visitors pause to observe, walk to a new viewpoint, and plant their feet again', () => {
  for (const [id, shot] of [
    ['linlan', 'arrival_unload'],
    ['zhouyan', 'arrival_zhouyan'],
    ['xuzhi', 'arrival_gate_beauty'],
    ['luchen', 'arrival_luchen'],
  ]) {
    const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((name) => actor(name));
    const world = createWorld({ state: state(shot, actors) });
    const roots = actors.map(({ id: name }) =>
      world.root.children.find((node) => node.name === name),
    );
    const root = roots.find((candidate) => candidate.name === id);
    root.animate(0, 0);
    const start = [...root.position];
    const standingLegs = root.children.filter((node) => node.name === 'leg');
    assert.ok(
      standingLegs.every(
        (leg) => Math.abs(leg.rotation[0]) < 0.001 && Math.abs(leg.bend.angle) < 0.001,
      ),
      `${id} stands normally when the gate task has not moved yet`,
    );
    let midWalk;
    let movingLifts = 0;
    for (let frame = 1; frame <= 960; frame++) {
      const previous = [...root.position];
      root.animate(frame / 60, 1 / 60);
      const displacement = Math.hypot(
        root.position[0] - previous[0],
        root.position[2] - previous[2],
      );
      if (displacement > 0 && standingLegs.some((leg) => leg.bend.angle > 0)) {
        movingLifts++;
      }
      if (frame <= 540) {
        assert.deepEqual(root.position, start, `${id} starts by looking around at the gate`);
        assert.ok(
          standingLegs.every((leg) => leg.bend.angle === 0),
          'standing never starts a step',
        );
      }
      if (frame === 780) midWalk = [...root.position];
      assert.ok(
        Math.hypot(...root.position.map((p, i) => p - start[i])) < 3.2,
        `${id} stays within the gate tableau`,
      );
    }
    const moved = Math.hypot(...midWalk.map((p, i) => p - start[i]));
    assert.ok(moved > 0.01, `${id} walks after the initial observation`);
    const arrived = Math.hypot(...root.position.map((p, i) => p - start[i]));
    assert.ok(arrived > moved, `${id} reaches a new viewpoint continuously`);
    assert.ok(movingLifts > 0, `${id} lifts a foot during the actual walk`);
    assert.ok(
      standingLegs.every((leg) => leg.bend.angle === 0),
      'feet stay planted at the new viewpoint',
    );
    if (id === 'zhouyan') {
      const head = root.children
        .find((node) => node.name === 'body')
        .children.find((node) => node.name.endsWith('_head'));
      assert.ok(head.rotation[0] < -0.2, 'continues observing the eaves at the new viewpoint');
    }
  }
});

test('opening alighting moves the whole group while each guest keeps a distinct arrival task', () => {
  const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
  const opening = state('arrival_gate', actors);
  const world = createWorld({ state: opening, mode: 'alighting' });
  for (const id of ['linlan', 'zhouyan', 'xuzhi', 'luchen']) {
    const root = world.root.children.find((node) => node.name === id);
    assert.ok(root, `${id} is visible during the opening alighting beat`);
    root.animate(0, 0);
    const start = [...root.position];
    root.animate(1, 0);
    assert.ok(Math.hypot(...root.position.map((p, i) => p - start[i])) > 0.1, `${id} moves`);
  }
  assert.equal(performanceFor(actor('linlan'), opening, false, true), 'camera');
  assert.equal(performanceFor(actor('zhouyan'), opening, false, true), 'admire');
  assert.equal(performanceFor(actor('xuzhi'), opening, false, true), 'glance');
  assert.equal(performanceFor(actor('luchen'), opening, false, true), 'welcome');
});

test('actual speech starts late while Lu Chen keeps his hands still and freezes on pause', () => {
  const rig = characterModel('luchen');
  let speaker = '';
  animateCharacter(rig, actor('luchen', '陆沉'), state('arrival_gate'), { speaker: () => speaker });
  rig.root.animate(30, 0.05);
  const idle = rig.elbows[0].rotation[0];
  const idleArm = [...rig.arms[0].rotation];
  const idleHand = [...rig.hands[0].rotation];
  speaker = '陆沉';
  for (let i = 0; i < 120; i++) rig.root.animate(30 + i * 0.05, 0.05);
  const speaking = rig.elbows[0].rotation[0];
  assert.equal(speaking, idle);
  assert.deepEqual(rig.arms[0].rotation, idleArm);
  assert.deepEqual(rig.hands[0].rotation, idleHand);
  assert.ok(rig.head.children[0].bend.angle > 0.015, 'jaw follows audible speech');
  const pose = [...rig.head.rotation, ...rig.arms[0].rotation, ...rig.elbows[0].rotation];
  rig.root.animate(35.95, 0);
  assert.deepEqual(
    [...rig.head.rotation, ...rig.arms[0].rotation, ...rig.elbows[0].rotation],
    pose,
  );
  for (let i = 0; i < 16; i++) rig.root.animate(36 + i * 0.05, 0.05);
  assert.equal(rig.elbows[0].rotation[0], speaking);
  speaker = '许栀';
  for (let i = 0; i < 10; i++) rig.root.animate(37 + i * 0.05, 0.05);
  assert.equal(rig.elbows[0].rotation[0], idle);
  assert.equal(rig.head.children[0].bend.angle, 0, 'mouth closes when playback ends');
});

test('Lu Chen idle keeps both hands and arm joints fixed across frames', () => {
  const rig = characterModel('luchen');
  animateCharacter(rig, actor('luchen', '陆沉'), state('quiet_room'));
  rig.root.animate(0, 0);
  const pose = {
    arms: rig.arms.map((arm) => [...arm.rotation]),
    elbows: rig.elbows.map((elbow) => [...elbow.rotation]),
    hands: rig.hands.map((hand) => [...hand.rotation]),
  };
  rig.root.animate(8, 0.05);
  assert.deepEqual(
    rig.arms.map((arm) => [...arm.rotation]),
    pose.arms,
  );
  assert.deepEqual(
    rig.elbows.map((elbow) => [...elbow.rotation]),
    pose.elbows,
  );
  assert.deepEqual(
    rig.hands.map((hand) => [...hand.rotation]),
    pose.hands,
  );
});

test('speech leaves writing, eating and hidden voices under story control', () => {
  const monk = actor('luchen', '陆沉');
  for (const speaker of ['系统', '陆沉（心声）', '陆沉（门外）', '陆沉的影子', ''])
    assert.equal(isActorSpeaking(monk, speaker), false);
  assert.equal(isActorSpeaking({ ...monk, visible: false }, '陆沉'), false);
  assert.equal(isActorSpeaking(monk, '陆沉（低声）'), true);
  for (const [id, shot] of [
    ['luchen', 'register_desk'],
    ['linlan', 'refectory_eating'],
  ]) {
    const rigs = [characterModel(id, 'seated'), characterModel(id, 'seated')];
    rigs.forEach((rig, i) => {
      animateCharacter(rig, actor(id), state(shot), { speaker: () => (i ? id : '') });
      for (let step = 0; step < 30; step++) rig.root.animate(step * 0.05, 0.05);
    });
    for (const key of ['head', 'body'])
      assert.deepEqual(rigs[0][key].rotation, rigs[1][key].rotation);
    for (let i = 0; i < 2; i++)
      assert.deepEqual(rigs[0].arms[i].rotation, rigs[1].arms[i].rotation);
  }
});

test("arrival and registration beats carry each companion's established activity across lines", () => {
  const expected = [
    ['arrival_gate_beauty', 'linlan', 'camera'],
    ['arrival_gate_beauty', 'zhouyan', 'admire'],
    ['arrival_gate_beauty', 'xuzhi', 'glance'],
    ['arrival_weather', 'xuzhi', 'glance'],
    ['arrival_zhouyan', 'zhouyan', 'admire'],
    ['register_camera_bell', 'linlan', 'camera'],
    ['register_drag_mark', 'zhouyan', 'point_floor'],
    ['register_ribbon', 'xuzhi', 'ribbon'],
  ];
  for (const [shot, id, action] of expected)
    assert.equal(
      performanceFor(actor(id), state(shot)),
      action,
      `${id} keeps ${action} in ${shot}`,
    );
});

test('拖痕质疑时周砚仍面向陆沉并用手指向地面', () => {
  const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
  const game = state('register_drag_mark', actors);
  game.sceneKey = 'mini_register';
  const world = createWorld({ state: game });
  const zhouyan = world.root.children.find((node) => node.name === 'zhouyan');
  zhouyan.animate(2, 0);
  const [x, , z] = zhouyan.position;
  const expectedFacing = Math.atan2(-x, -0.7 - z);
  const facingDelta = Math.atan2(
    Math.sin(zhouyan.rotation[1] - expectedFacing),
    Math.cos(zhouyan.rotation[1] - expectedFacing),
  );
  assert.ok(Math.abs(facingDelta) < 0.08, '周砚身体继续面向登记桌旁的陆沉');
  const body = zhouyan.children.find((node) => node.name === 'body');
  const head = body.children.find((node) => node.name.endsWith('_head'));
  assert.ok(body.rotation[0] > 0.25, '周砚俯身指向地面');
  assert.ok(head.rotation[0] > 0.3, '周砚视线落到拖痕');
  assert.equal(performanceFor(actor('zhouyan'), game), 'point_floor');
});

test('meal utensil follows the bowl and mouth anchors with a natural wrist roll', () => {
  const low = mealLift(0.1, 0);
  const high = mealLift(1.7, 0);
  const lowTarget = mealHandTarget(low, 0.1);
  const highTarget = mealHandTarget(high, 1.7);
  assert.ok(high > low, 'the spoon rises during the bite');
  assert.ok(highTarget[0] > lowTarget[0]);
  assert.ok(highTarget[1] < lowTarget[1]);
  const lowRotation = mealUtensilRotation(low, 0.1);
  const highRotation = mealUtensilRotation(high, 1.7);
  assert.ok(highRotation[0] < lowRotation[0], 'the spoon rotates toward the mouth');
  assert.notEqual(highRotation[2], lowRotation[2], 'the wrist changes angle while lifting');
});
