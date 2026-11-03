import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { vec3 } from 'wgpu-matrix';

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
const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const { worldMatrix } = await import('./skinned_character_fixture.mjs');
const assetRoot = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', assetRoot)));
const packed = await readFile(new URL(manifest.binary, assetRoot));
const actor = (id, portrait = id) => ({ id, portrait, name: id, visible: true, status: '' });
const state = (vaseBroken = false, portrait = 'zhouyan') => ({
  sceneKey: 'mini_listen',
  shotKey: vaseBroken ? 'listen_vase' : 'listen_skin',
  flags: { skin_seen: true, vase_broken: vaseBroken },
  actors: [actor('huipu'), actor('victim', portrait)],
  inventory: [],
  dialogue: { speaker: '', text: '' },
});

async function bind(root) {
  const metadata = manifest.characterModels[root.name].skin;
  const range = manifest.meshes[metadata.mesh];
  const influences = await readFile(new URL(metadata.influences, assetRoot));
  const vertices = new Float32Array(
    packed.buffer,
    packed.byteOffset + range.vertexOffset,
    range.vertexCount,
  );
  const skin = decodeCharacterSkin(
    metadata,
    influences.buffer.slice(influences.byteOffset, influences.byteOffset + influences.byteLength),
    range.vertexCount / 16,
    vertices,
  );
  const update = createSkinPose(root.skinTargets, skin.skeleton, {
    vertices,
    indices: new Uint32Array(
      packed.buffer,
      packed.byteOffset + range.indexOffset,
      range.indexCount,
    ),
    skin,
  });
  update();
  root.blenderEnabled = true;
  return {
    frame(time) {
      root.animate(time, 1 / 60);
      update();
      assert.equal(root.blenderAction, undefined, 'generic clips must not override bedside poses');
    },
    point(name) {
      const index = skin.skeleton.bones.findIndex((bone) => bone.name === name);
      const palette = root.skinTargets.mesh.skinMatrices.subarray(index * 16, index * 16 + 16);
      const position = vec3.transformMat4(skin.skeleton.bones[index].position, palette);
      return vec3.transformMat4(position, worldMatrix(root, root));
    },
  };
}

test('the abbot stands beside the bed, works over its occupant and stops when the vase breaks', async () => {
  for (const startled of [false, true]) {
    const world = createWorld({ state: state(startled) });
    const root = world.root.children.find((node) => node.name === 'huipu');
    const skin = await bind(root);
    const snapshots = [];
    for (const time of [0, 0.75, 1.5, 5]) {
      skin.frame(time);
      assert.deepEqual(root.rotation, [0, -Math.PI / 2, 0]);
      assert.equal(root.position[1], 0);
      for (const side of ['R', 'L']) {
        const hand = skin.point('hand.' + side);
        assert.ok(hand[0] < -2.65 && hand[0] > -3.2, 'hands reach over the occupied mattress');
        assert.ok(hand[1] > 0.68 && hand[1] < 0.94, 'hands stay close to the lying torso');
        const foot = skin.point('foot.' + side);
        assert.ok(foot[1] < 0.16 && foot[0] > -2.3, 'feet remain on the floor beside the bed');
      }
      snapshots.push(Array.from(skin.point('hand.R')));
    }
    if (startled) {
      assert.deepEqual(snapshots[0], snapshots[3]);
      assert.ok(root.skinTargets.head.rotation[1] < -1, 'turn toward the doorway after stopping');
    } else
      assert.ok(vec3.distance(snapshots[0], snapshots[1]) > 0.015, 'show a visible hand action');
  }
});

test('either victim lies lengthwise within the mattress and stays still', async () => {
  for (const identity of ['zhouyan', 'xuzhi']) {
    const world = createWorld({ state: state(false, identity) });
    const root = world.root.children.find((node) => node.name === identity);
    const skin = await bind(root);
    skin.frame(0);
    const first = Array.from(skin.point('head'));
    skin.frame(5);
    const head = skin.point('head');
    const feet = skin.point('foot.R');
    assert.deepEqual(Array.from(head), first);
    assert.ok(head[2] < -2 && feet[2] > -1.2 && feet[2] - head[2] > 1.1);
    assert.ok(Math.abs(head[0] + 3) < 0.2 && Math.abs(feet[0] + 3) < 0.2);
    assert.ok(head[1] > 0.6 && head[1] < 0.85);
    assert.deepEqual(root.rotation, [-Math.PI / 2, 0, 0]);
  }
});

test('the fallback rig also bends at the waist while reaching toward the bed', () => {
  const rig = characterModel('shangong');
  animateCharacter(rig, actor('huipu'), state());
  rig.root.animate(1, 0);
  assert.equal(rig.root.blenderAction, undefined);
  assert.equal(rig.root.rotation[0], 0);
  assert.ok(rig.body.rotation[0] > 0.8);
  for (const hand of rig.hands) {
    const point = vec3.transformMat4([0, 0, 0], worldMatrix(rig.root, hand));
    assert.ok(point[1] < 0.9 && point[2] > 0.5);
  }
});
