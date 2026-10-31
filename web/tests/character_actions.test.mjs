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
const actor = (id, name = id) => ({ id, name, portrait: id, visible: true });
const state = (shotKey, actors = []) => ({
  sceneKey: 'mini_arrival',
  shotKey,
  actors,
  flags: {},
  inventory: [],
  dialogue: { speaker: '', text: '' },
});

test('dialogue, save, inventory and pause updates keep rigs; visible changes rebuild them', () => {
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
  for (const update of [
    { shotKey: 'arrival_weather' },
    { flags: { red_candle_lit: true } },
    { actors: [{ ...game.actors[0], visible: false }] },
    { actors: [{ ...game.actors[0], portrait: 'xuzhi' }] },
  ])
    assert.notEqual(key, visualKey({ ...game, ...update }, 'story'));
  assert.notEqual(key, visualKey(game, 'travel'));
});

test('admiring the gate tilts and scans the head; the camera rises with both arms', () => {
  const admirer = characterModel('xuzhi');
  animateCharacter(admirer, actor('xuzhi'), state('arrival_gate_beauty'));
  admirer.root.animate(0, 0);
  const first = [...admirer.head.rotation];
  admirer.root.animate(1.5, 0);
  assert.ok(admirer.head.rotation[0] < first[0] - 0.2);
  assert.ok(admirer.head.rotation[1] > first[1] + 0.2);
  for (const [shot, raised] of [
    ['arrival_weather', true],
    ['dawn_courtyard', false],
  ]) {
    const rig = characterModel('linlan');
    animateCharacter(rig, actor('linlan'), state(shot));
    rig.root.animate(0, 0);
    const height = rig.camera.position[1];
    rig.root.animate(2, 0);
    assert.ok(rig.camera.position[1] > height + (raised ? 0.4 : 0.1));
    assert.ok(rig.elbows.every((joint) => joint.rotation[0] < -0.6));
    assert.equal(Math.sign(rig.head.rotation[0]), raised ? -1 : 1);
    assert.equal(rig.body.children.filter((node) => node.name === 'held_camera').length, 1);
  }
});

test('arrival gestures settle into a follow-up observation instead of looping the same pose', () => {
  const admirer = characterModel('xuzhi');
  animateCharacter(admirer, actor('xuzhi'), state('arrival_gate_beauty'));
  admirer.root.animate(1.5, 0);
  const scan = admirer.head.rotation[1];
  admirer.root.animate(6.5, 0);
  const settled = admirer.head.rotation[1];
  assert.ok(Math.abs(settled) < Math.abs(scan), 'the full scan settles on the eave');

  const photographer = characterModel('linlan');
  animateCharacter(photographer, actor('linlan'), state('arrival_weather'));
  photographer.root.animate(2, 0);
  const raised = photographer.camera.position[1];
  photographer.root.animate(7, 0);
  assert.ok(photographer.camera.position[1] < raised, 'the camera lowers after checking the frame');
  assert.ok(photographer.camera.position[1] > 0.2, 'the camera remains in the hands');
});

test('arrival actors walk before their scripted gestures and stop at the authored position', () => {
  for (const [id, shot] of [
    ['linlan', 'arrival_unload'],
    ['zhouyan', 'arrival_zhouyan'],
    ['luchen', 'arrival_luchen'],
  ]) {
    const world = createWorld({ state: state(shot, [actor(id)]) });
    const root = world.root.children.find((node) => node.name === id);
    root.animate(0, 0);
    const start = [...root.position];
    root.animate(0.7, 0);
    assert.ok(Math.hypot(...root.position.map((p, i) => p - start[i])) > 0.2);
    const legs = root.children.filter((node) => node.name === 'leg');
    assert.ok(legs.some((leg) => Math.abs(leg.rotation[0]) > 0.05));
    root.animate(3, 0);
    const end = [...root.position];
    root.animate(9, 0);
    assert.deepEqual(root.position, end);
    assert.ok(legs.every((leg) => leg.rotation[0] === 0 && leg.bend.angle === 0));
    if (id === 'zhouyan') {
      const head = root.children
        .find((node) => node.name === 'body')
        .children.find((node) => node.name.endsWith('_head'));
      assert.ok(head.rotation[0] < -0.2, 'looks up only after reaching the plaque');
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
  assert.equal(performanceFor(actor('xuzhi'), opening, false, true), 'luggage');
  assert.equal(performanceFor(actor('luchen'), opening, false, true), 'welcome');
});

test('actual speech starts even late in a shot, stays animated, releases, and freezes on pause', () => {
  const rig = characterModel('luchen');
  let speaker = '';
  animateCharacter(rig, actor('luchen', '陆沉'), state('arrival_gate'), { speaker: () => speaker });
  rig.root.animate(30, 0.05);
  const idle = rig.elbows[0].rotation[0];
  speaker = '陆沉';
  for (let i = 0; i < 120; i++) rig.root.animate(30 + i * 0.05, 0.05);
  const speaking = rig.elbows[0].rotation[0];
  assert.ok(speaking < idle - 0.3);
  assert.ok(rig.head.children[0].bend.angle > 0.015, 'jaw follows audible speech');
  const pose = [...rig.head.rotation, ...rig.arms[0].rotation, ...rig.elbows[0].rotation];
  rig.root.animate(35.95, 0);
  assert.deepEqual(
    [...rig.head.rotation, ...rig.arms[0].rotation, ...rig.elbows[0].rotation],
    pose,
  );
  for (let i = 0; i < 16; i++) rig.root.animate(36 + i * 0.05, 0.05);
  assert.ok(Math.abs(rig.elbows[0].rotation[0] - speaking) > 0.05);
  speaker = '许栀';
  for (let i = 0; i < 10; i++) rig.root.animate(37 + i * 0.05, 0.05);
  assert.equal(rig.elbows[0].rotation[0], idle);
  assert.equal(rig.head.children[0].bend.angle, 0, 'mouth closes when playback ends');
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
    ['arrival_gate_beauty', 'xuzhi', 'admire'],
    ['arrival_weather', 'xuzhi', 'admire'],
    ['arrival_zhouyan', 'zhouyan', 'look_up'],
    ['register_camera_bell', 'linlan', 'camera'],
    ['register_ribbon', 'xuzhi', 'ribbon'],
    ['register_luggage', 'zhouyan', 'inspect'],
  ];
  for (const [shot, id, action] of expected)
    assert.equal(
      performanceFor(actor(id), state(shot)),
      action,
      `${id} keeps ${action} in ${shot}`,
    );
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
