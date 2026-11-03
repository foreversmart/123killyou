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
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { parseBlenderAnimations, applyBlenderPose } =
  await import('../src/scene/world_character/blender_action_library.ts');
const { extractZipEntry } = await import('../src/shared/lib/zip.ts');
const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const model = manifest.characterModels.luchen;
const range = manifest.meshes[model.skin.mesh];
const packed = await readFile(new URL(manifest.binary, root));
const influences = await readFile(new URL(model.skin.influences, root));
const bytes = (buffer) =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const skin = decodeCharacterSkin(model.skin, bytes(influences), range.vertexCount / 16);
const geometry = {
  vertices: new Float32Array(bytes(packed), range.vertexOffset, range.vertexCount),
  indices: new Uint32Array(bytes(packed), range.indexOffset, range.indexCount),
  skin,
};
const zip = await readFile(new URL(model.animationSource, root));
const animations = parseBlenderAnimations(await extractZipEntry(bytes(zip)));
const fixedBones = skin.skeleton.bones.flatMap((bone, index) => {
  for (let current = index; current >= 0; current = skin.skeleton.bones[current].parent)
    if (/^upper_arm\./.test(skin.skeleton.bones[current].name)) return [index];
  return [];
});
function segmentDistance(point, start, end) {
  const direction = end.map((value, axis) => value - start[axis]);
  const squared = direction.reduce((sum, value) => sum + value * value, 0);
  const projected = point.reduce(
    (sum, value, axis) => sum + (value - start[axis]) * direction[axis],
    0,
  );
  const t = Math.max(0, Math.min(1, projected / squared));
  return Math.hypot(...point.map((value, axis) => value - start[axis] - t * direction[axis]));
}
// Select wrists, palms and fingers by geometry rather than reproducing the
// runtime weight threshold. The broad 10 cm envelope also catches wrist seams
// and nearby vertices whose weights mostly belong to the torso.
const handSegments = skin.skeleton.bones.flatMap((bone) =>
  /^(hand|index|middle|pinky|ring|thumb)/.test(bone.name)
    ? [[bone.position, skin.skeleton.bones[bone.parent].position]]
    : [],
);
const handVertices = Array.from({ length: range.vertexCount / 16 }, (_, vertex) => vertex).filter(
  (vertex) =>
    handSegments.some(
      ([start, end]) =>
        segmentDistance(geometry.vertices.subarray(vertex * 16, vertex * 16 + 3), start, end) < 0.1,
    ),
);
assert.ok(handVertices.length > 20_000, 'the independent region covers both hands and wrists');
function armSurface(palette) {
  return handVertices.flatMap((vertex) => {
    const position = geometry.vertices.subarray(vertex * 16, vertex * 16 + 3);
    const point = [0, 0, 0];
    for (let slot = 0; slot < 4; slot++) {
      const influence = vertex * 4 + slot,
        offset = skin.joints[influence] * 16,
        weight = skin.weights[influence];
      for (let axis = 0; axis < 3; axis++)
        point[axis] +=
          weight *
          (palette[offset + axis] * position[0] +
            palette[offset + axis + 4] * position[1] +
            palette[offset + axis + 8] * position[2] +
            palette[offset + axis + 12]);
    }
    return point;
  });
}
const actor = { id: 'luchen', name: '陆沉', visible: true };

for (const blender of [false, true]) {
  test(`Lu Chen keeps rendered arms, hands and fingers fixed with ${blender ? 'Blender' : 'procedural'} animation`, () => {
    const poses = new Map();
    const surfaces = new Map();
    for (const [sceneKey, shotKey, pose, options] of [
      ['mini_arrival', 'arrival_gate', 'standing', {}],
      ['mini_arrival', 'arrival_luchen', 'standing', {}],
      ['mini_register', 'register_desk', 'seated', {}],
      ['mini_register', 'register_key_tags', 'standing', {}],
      ['mini_register', 'register_drag_mark', 'seated', {}],
      ['mini_refectory', 'refectory_eating', 'standing', {}],
      ['mini_refectory', 'refectory_glance', 'standing', {}],
      ['mini_corridor_candle', 'corridor_candles', 'standing', {}],
      ['mini_corridor_candle', 'corridor_warning', 'standing', {}],
      ['mini_dawn', 'dawn_gate', 'standing', {}],
      ['mini_register', 'travel', 'standing', { traveling: true, walkDuration: 6 }],
      ['mini_refectory', 'travel', 'standing', { traveling: true, walkDuration: 6 }],
    ]) {
      const rig = characterModel('luchen', pose);
      const state = { sceneKey, shotKey, flags: {} };
      animateCharacter(rig, actor, state, { ...options, speaker: () => '陆沉' });
      rig.root.blenderEnabled = blender;
      const update = createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
      for (const time of [0, 0.15, 0.9, 2.4, 5.8, 9, 45]) {
        if (options.traveling) rig.root.position[2] = 0.7 * Math.min(time, options.walkDuration);
        else if (shotKey === 'arrival_gate') rig.root.position[0] = 0.12 * Math.min(time, 6);
        rig.root.animate(time, 1 / 60);
        if (blender && rig.root.blenderAction)
          applyBlenderPose(rig.root.blenderAction, time, animations, rig.root.blenderTargets);
        if (options.traveling && time === 0.9)
          assert.ok(
            rig.knees.some((knee) => knee.rotation[0] > 0.02),
            'travel really lifts a leg',
          );
        if (options.traveling && time === 45)
          assert.ok(rig.legs.every((leg) => leg.rotation[0] === 0 && leg.bend.angle === 0));
        update();
        const palette = rig.root.skinTargets.mesh.skinMatrices;
        const hands = fixedBones.flatMap((index) =>
          Array.from(palette.subarray(index * 16, index * 16 + 16)),
        );
        const expected = poses.get(pose);
        if (expected) assert.deepEqual(hands, expected, `${sceneKey}/${shotKey} at ${time}s`);
        else poses.set(pose, hands);
        const surface = armSurface(palette);
        const expectedSurface = surfaces.get(pose);
        if (expectedSurface)
          assert.deepEqual(surface, expectedSurface, `${sceneKey}/${shotKey} arm skin at ${time}s`);
        else surfaces.set(pose, surface);
      }
    }
  });
}

test('fixed Lu Chen hands preserve a moving gait and head turn', () => {
  const rig = characterModel('luchen');
  animateCharacter(
    rig,
    actor,
    { sceneKey: 'mini_register', shotKey: 'travel', flags: {} },
    { traveling: true, walkDuration: 6 },
  );
  rig.root.position[2] = 0.28;
  rig.root.animate(0.4, 0);
  const leg = [...rig.legs[0].rotation];
  rig.root.position[2] = 0.98;
  rig.root.animate(1.4, 0);
  assert.notDeepEqual(rig.legs[0].rotation, leg);
  const greeter = characterModel('luchen');
  animateCharacter(greeter, actor, {
    sceneKey: 'mini_arrival',
    shotKey: 'arrival_luchen',
    flags: {},
  });
  greeter.root.animate(0, 0);
  const head = [...greeter.head.rotation];
  greeter.root.animate(1.4, 0);
  assert.notDeepEqual(greeter.head.rotation, head);
});

for (const blender of [false, true]) {
  test(`Lu Chen's corridor speech nod reaches the skin and settles after interruption (${blender ? 'Blender' : 'procedural'})`, () => {
    const headIndex = skin.skeleton.bones.findIndex((bone) => bone.name === 'head');
    for (const shotKey of ['corridor_candles', 'corridor_warning', 'corridor_two_gongs']) {
      let speaker = '';
      const speaking = characterModel('luchen');
      const silent = characterModel('luchen');
      const updates = [speaking, silent].map((rig) => {
        animateCharacter(
          rig,
          actor,
          { sceneKey: 'mini_corridor_candle', shotKey, flags: {} },
          { speaker: () => (rig === speaking ? speaker : '') },
        );
        rig.root.blenderEnabled = blender;
        return createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
      });
      const frame = (time, delta) => {
        [speaking, silent].forEach((rig, index) => {
          rig.root.animate(time, delta);
          if (blender && rig.root.blenderAction)
            applyBlenderPose(rig.root.blenderAction, time, animations, rig.root.blenderTargets);
          updates[index]();
        });
      };
      const headMatrix = (rig) =>
        Array.from(
          rig.root.skinTargets.mesh.skinMatrices.subarray(headIndex * 16, headIndex * 16 + 16),
        );
      frame(0, 0);
      assert.deepEqual(headMatrix(speaking), headMatrix(silent));
      speaker = '陆沉';
      const pitches = [];
      for (let i = 1; i <= 120; i++) {
        frame(i / 60, 1 / 60);
        const pitch = speaking.head.rotation[0] - silent.head.rotation[0];
        pitches.push(pitch);
        assert.ok(Math.abs(pitch) <= 0.0361, 'the speech beat stays within about two degrees');
      }
      assert.ok(Math.min(...pitches) < -0.02 && Math.max(...pitches) > 0.02);
      assert.notDeepEqual(headMatrix(speaking), headMatrix(silent), 'the rendered head moves');
      const paused = headMatrix(speaking);
      frame(2, 0);
      assert.deepEqual(headMatrix(speaking), paused, 'pause freezes the speech pose');
      speaker = '林岚';
      for (let i = 1; i <= 18; i++) frame(2 + i / 60, 1 / 60);
      assert.deepEqual(headMatrix(speaking), headMatrix(silent), 'another speaker lets it settle');
      for (const excluded of ['系统', '陆沉（心声）', '陆沉（门外）', '']) {
        speaker = excluded;
        frame(3, 1 / 60);
        assert.deepEqual(headMatrix(speaking), headMatrix(silent));
      }
    }
  });
}
