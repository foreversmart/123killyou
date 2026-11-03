import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
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
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
const { performanceKey } = await import('../src/scene/world/performance_key.ts');
const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const actor = (id, portrait = id) => ({ id, name: id, portrait, visible: true });
const state = (sceneKey, shotKey = '', flags = {}, actors = []) => ({
  sceneKey,
  shotKey,
  flags,
  actors,
  dialogue: { speaker: '', text: '' },
  inventory: [],
});
function frame(root, t) {
  const nodes = new Map();
  function visit(n, parent) {
    n.animate?.(t, 0);
    n.updateSkin?.();
    let m;
    if (n.matrix) m = mat4.multiply(parent, n.matrix);
    else {
      m = mat4.translate(parent, n.position);
      m = mat4.rotateY(m, n.rotation[1]);
      m = mat4.rotateX(m, n.rotation[0]);
      m = mat4.rotateZ(m, n.rotation[2]);
      m = mat4.scale(m, n.scale);
    }
    nodes.set(n, m);
    n.children.forEach((child) => visit(child, m));
  }
  visit(root, mat4.identity());
  return nodes;
}
const find = (frame, name) => [...frame.keys()].find((n) => n.name === name);

async function bindSkin(rig) {
  const root = new URL('../public/art/world/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('library.json', root)));
  const metadata = manifest.characterModels[rig.root.name].skin;
  const range = manifest.meshes[metadata.mesh];
  const influences = await readFile(new URL(metadata.influences, root));
  const binary = await readFile(new URL(manifest.binary, root));
  const skin = decodeCharacterSkin(
    metadata,
    influences.buffer.slice(influences.byteOffset, influences.byteOffset + influences.byteLength),
    range.vertexCount / 16,
  );
  const geometry = {
    vertices: new Float32Array(
      binary.buffer,
      binary.byteOffset + range.vertexOffset,
      range.vertexCount,
    ),
    indices: new Uint32Array(
      binary.buffer,
      binary.byteOffset + range.indexOffset,
      range.indexCount,
    ),
    skin,
  };
  rig.root.updateSkin = createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
  rig.root.updateSkin();
  return skin;
}

test('registration keeps both Lu Chen hands still without a writing prop', () => {
  const world = createWorld({
    state: state('mini_register', 'register_desk', {}, [actor('luchen')]),
  });
  const start = frame(world.root, 0.4),
    end = frame(world.root, 1.8);
  const monk = find(end, 'luchen'),
    body = monk.children.find((n) => n.name === 'body');
  const arms = body.children.filter((n) => n.name === 'arm');
  for (const arm of arms) {
    const hand = arm.children[0].children[0];
    assert.deepEqual([...start.get(hand)], [...end.get(hand)]);
  }
  assert.equal(find(end, 'writing_brush'), undefined);
});

test('meal choices retain one bowl, with hands lifting and lowering without animating the monk', async () => {
  const game = state(
    'mini_refectory',
    'refectory_eating',
    { meal_zhouyan_ate: true, meal_linlan_refused: true },
    [actor('zhouyan'), actor('linlan'), actor('luchen')],
  );
  const world = createWorld({ state: game });
  const f = frame(world.root, 1.8);
  assert.equal([...f.keys()].filter((n) => n.name === 'zhouyan_held_bowl').length, 1);
  assert.equal([...f.keys()].filter((n) => n.name === 'zhouyan_bowl').length, 0);
  assert.equal([...f.keys()].filter((n) => n.name === 'linlan_held_bowl').length, 0);
  assert.equal(performanceFor(actor('luchen'), game), 'idle');
  assert.equal(
    world.hotspots.find((p) => p.id === 'zhouyan_bowl').anchor.node.name,
    'zhouyan_held_bowl',
  );
  const rig = characterModel('zhouyan', 'seated');
  animateCharacter(rig, actor('zhouyan'), game);
  // The renderer binds the native bone lengths and prop sockets before the
  // first animation frame. Generic control transforms are not the visible rig.
  const skin = await bindSkin(rig);
  const low = frame(rig.root, 0),
    high = frame(rig.root, 2),
    settled = frame(rig.root, 5),
    nextBite = frame(rig.root, 6.8);
  assert.ok(high.get(rig.hands[0])[13] > low.get(rig.hands[0])[13] + 0.1);
  assert.ok(settled.get(rig.hands[0])[13] < high.get(rig.hands[0])[13] - 0.1);
  assert.ok(nextBite.get(rig.hands[0])[13] > settled.get(rig.hands[0])[13] + 0.1);
  const spoon = (snapshot) =>
    vec3.transformMat4([0, 0.13, 0.16], snapshot.get(find(snapshot, 'meal_utensils')));
  const bowl = (snapshot) =>
    vec3.transformMat4([0, 0.125, 0], snapshot.get(find(snapshot, 'zhouyan_held_bowl')));
  const head = skin.skeleton.bones.findIndex((bone) => bone.name === 'head');
  frame(rig.root, 2);
  const lip = vec3.transformMat4(
    vec3.add(skin.skeleton.bones[head].position, [-0.004, 0.031, 0.121]),
    rig.root.skinTargets.mesh.skinMatrices.subarray(head * 16, head * 16 + 16),
  );
  const mouth = vec3.transformMat4(lip, high.get(rig.root));
  assert.ok(vec3.distance(spoon(low), bowl(low)) < 0.04, 'spoon rests on the bowl rim');
  assert.ok(vec3.distance(spoon(high), mouth) < 0.04, 'spoon reaches the skinned lower lip');
  game.flags.refectory_meal_finished = true;
  assert.notEqual(performanceFor(actor('zhouyan'), game), 'eat');
});

test('seated and kneeling legs bend at the knee and keep their full original length', () => {
  for (const pose of ['seated', 'kneeling']) {
    const rig = characterModel('linlan', pose);
    rig.legs.forEach((leg, i) => {
      assert.deepEqual(leg.scale, [1, 1, 1]);
      assert.ok(leg.bend.angle > 1);
      assert.equal(leg.bend.angle, rig.knees[i].rotation[0]);
    });
  }
  const rig = characterModel('linlan', 'kneeling');
  animateCharacter(
    rig,
    actor('skin_double', 'linlan'),
    state('mini_double', 'double_calm', { double_calm: true }),
  );
  const heights = [0, 0.7, 1.5].map((t) => {
    rig.root.animate(t, 0);
    return rig.body.position[1];
  });
  assert.ok(
    heights[0] > heights[1] && heights[1] > heights[2],
    'calming visibly lowers the body through the pose',
  );
});

test('travel changes world position, stops at the destination, and leaves Lu Chen inside the temple', () => {
  const world = createWorld({
    state: state('mini_ending', '', {}, [actor('linlan'), actor('luchen')]),
    mode: 'travel',
  });
  const initial = frame(world.root, 0);
  const traveler = find(initial, 'linlan'),
    monk = find(initial, 'luchen');
  const moved = frame(world.root, 2),
    arrived = frame(world.root, 4.5),
    later = frame(world.root, 9);
  assert.ok(moved.get(traveler)[14] < initial.get(traveler)[14] - 0.5);
  assert.deepEqual([...arrived.get(traveler)], [...later.get(traveler)]);
  assert.deepEqual([...initial.get(monk)], [...later.get(monk)]);
});

test('the double reaches the closed latch; only frenzy opens both leaves about their hinges', () => {
  const game = state('mini_double', 'double_exit', {}, [actor('skin_double', 'linlan')]);
  const world = createWorld({ state: game });
  const first = frame(world.root, 0),
    after = frame(world.root, 3);
  const double = find(after, 'linlan');
  assert.ok(after.get(double)[14] < first.get(double)[14] - 2);
  const leaves = [...after.keys()].filter((n) => n.name === 'door_leaf');
  leaves.forEach((leaf) => assert.equal(Math.abs(leaf.rotation[1]), 0));
  const open = createWorld({ state: { ...game, shotKey: 'double_frenzy', actors: [] } });
  const closed = frame(open.root, 0),
    swung = frame(open.root, 2);
  for (const leaf of [...swung.keys()].filter((n) => n.name === 'door_leaf')) {
    assert.ok(Math.abs(leaf.rotation[1]) > 1);
    assert.deepEqual([...closed.get(leaf).slice(12, 15)], [...swung.get(leaf).slice(12, 15)]);
  }
});

test('scripture progressively reduces scratching; stone guides and victims remain motionless', () => {
  const amplitudes = [1, 2, 3].map((verse) => {
    const rig = characterModel('linlan');
    animateCharacter(
      rig,
      actor('skin_double', 'linlan'),
      state('mini_double', 'double_scripture_' + verse),
    );
    rig.root.animate(0, 0);
    const a = rig.elbows[0].rotation[0];
    rig.root.animate(Math.PI / 26, 0);
    return Math.abs(rig.elbows[0].rotation[0] - a);
  });
  assert.ok(amplitudes[0] > amplitudes[1] && amplitudes[1] > amplitudes[2]);
  for (const [identity, a, game] of [
    ['shangong', actor('shangong'), state('mini_oracle', 'oracle_stone', { cup_failed: true })],
    ['linlan', actor('victim', 'linlan'), state('mini_listen')],
  ]) {
    const rig = characterModel(identity);
    animateCharacter(rig, a, game);
    const first = frame(rig.root, 0),
      later = frame(rig.root, 4);
    for (const [node, matrix] of first) assert.deepEqual([...matrix], [...later.get(node)]);
  }
});

test('save, pause and replay acknowledgements preserve the action clock; story changes reset it', () => {
  const game = state('mini_double', 'double_scripture_1', {}, [actor('skin_double', 'linlan')]);
  const key = performanceKey(game, 'story');
  assert.equal(
    key,
    performanceKey(
      {
        ...game,
        paused: true,
        lastAction: '已保存',
        dialogue: { speaker: '系统', text: '保存完成' },
      },
      'story',
    ),
  );
  assert.notEqual(key, performanceKey({ ...game, shotKey: 'double_scripture_2' }, 'story'));
  assert.notEqual(key, performanceKey({ ...game, flags: { double_calm: true } }, 'story'));
  assert.notEqual(key, performanceKey(game, 'travel'));
  const calmed = { ...game, flags: { double_calm: true }, shotKey: 'double_scripture_4' };
  assert.equal(
    performanceKey(calmed, 'story'),
    performanceKey({ ...calmed, shotKey: 'double_calm' }, 'story'),
  );
  const speaking = state('mini_arrival', 'arrival_gate', {}, [actor('luchen')]);
  speaking.dialogue.speaker = 'luchen';
  assert.equal(
    performanceKey(speaking, 'story'),
    performanceKey({ ...speaking, dialogue: { speaker: '系统', text: '已保存' } }, 'story'),
  );
});
