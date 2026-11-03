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
    return nextResolve(specifier, context);
  },
});

const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { parseBlenderAnimations, applyBlenderPose } =
  await import('../src/scene/world_character/blender_action_library.ts');
const { extractZipEntry } = await import('../src/shared/lib/zip.ts');
const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const metadata = manifest.characterModels.zhouyan.skin;
const range = manifest.meshes[metadata.mesh];
const packed = await readFile(new URL('library.bin', root));
const vertices = new Float32Array(
  packed.buffer,
  packed.byteOffset + range.vertexOffset,
  range.vertexCount,
);
const indices = new Uint32Array(
  packed.buffer,
  packed.byteOffset + range.indexOffset,
  range.indexCount,
);
const weights = await readFile(new URL(metadata.influences, root));
const skin = decodeCharacterSkin(
  metadata,
  weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
  vertices.length / 16,
  vertices,
);
const archive = await readFile(new URL('npc_rigged.zip', root));
const clips = parseBlenderAnimations(
  await extractZipEntry(
    archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
  ),
);
const geometry = { vertices, indices, skin };
const actor = { id: 'zhouyan', name: '周砚', visible: true };

function point(vertex, palette) {
  const result = [0, 0, 0];
  for (let slot = 0; slot < 4; slot++) {
    const influence = vertex * 4 + slot;
    const bone = skin.joints[influence] * 16;
    const value = vec3.transformMat4(
      vertices.subarray(vertex * 16, vertex * 16 + 3),
      palette.subarray(bone, bone + 16),
    );
    for (let axis = 0; axis < 3; axis++) result[axis] += value[axis] * skin.weights[influence];
  }
  return result;
}

function setup(pose, shot, flags = {}) {
  const rig = characterModel('zhouyan', pose);
  animateCharacter(rig, actor, { sceneKey: 'mini_refectory', shotKey: shot, flags });
  rig.root.blenderEnabled = Boolean(rig.root.blenderAction);
  const update = createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
  update();
  return {
    rig,
    frame(time) {
      rig.root.animate(time, 1 / 60);
      if (rig.root.blenderAction)
        applyBlenderPose(rig.root.blenderAction, time, clips, rig.root.blenderTargets);
      update();
      return rig.root.skinTargets.mesh.skinMatrices;
    },
  };
}

test('Zhou Yan remains seated at bench height while observing, eating, and putting down his bowl', () => {
  for (const [shot, flags] of [
    ['refectory_table', {}],
    ['refectory_eating', { meal_zhouyan_ate: true }],
    ['refectory_eating', { meal_zhouyan_refused: true }],
    ['refectory_eating', { refectory_meal_finished: true }],
  ]) {
    const item = setup('seated', shot, flags);
    for (const time of [0, 1.5, 3.2, 5.1]) {
      const palette = item.frame(time);
      let lowest = Infinity,
        highest = -Infinity,
        seat = Infinity;
      for (let vertex = 0; vertex < vertices.length / 16; vertex++) {
        const p = point(vertex, palette);
        lowest = Math.min(lowest, p[1]);
        highest = Math.max(highest, p[1]);
        const y = vertices[vertex * 16 + 1],
          z = vertices[vertex * 16 + 2];
        if (y > -0.08 && y < 0.02 && z < -0.09) seat = Math.min(seat, p[1]);
      }
      assert.ok(lowest >= -0.005, `${shot} t=${time}: foot below floor ${lowest}`);
      assert.ok(highest < 1.52, `${shot} t=${time}: seated character stands ${highest}m tall`);
      assert.ok(
        seat * item.rig.root.scale[1] > 0.38 && seat * item.rig.root.scale[1] < 0.48,
        `${shot} t=${time}: hips miss the 0.42m bench at ${seat * item.rig.root.scale[1]}m`,
      );
      for (const side of ['L', 'R']) {
        const bonePoint = (name) => {
          const index = skin.skeleton.bones.findIndex((bone) => bone.name === name + '.' + side);
          return vec3.transformMat4(
            skin.skeleton.bones[index].position,
            palette.subarray(index * 16, index * 16 + 16),
          );
        };
        const hip = bonePoint('thigh'),
          knee = bonePoint('shin'),
          foot = bonePoint('foot');
        assert.ok(knee[2] > hip[2] + 0.25, 'knees bend forward below the table');
        assert.ok(Math.abs(knee[1] - hip[1]) < 0.05, 'thighs rest horizontally');
        assert.ok(foot[1] < knee[1] - 0.3, 'lower legs hang down toward the floor');
      }
    }
  }
});

test('Zhou Yan keeps his full standing height with the fitted lower body', () => {
  const { frame } = setup('standing', '');
  const palette = frame(0);
  let minimum = Infinity,
    maximum = -Infinity;
  for (let vertex = 0; vertex < vertices.length / 16; vertex++) {
    const y = point(vertex, palette)[1];
    minimum = Math.min(minimum, y);
    maximum = Math.max(maximum, y);
  }
  assert.ok(minimum >= -0.005);
  assert.ok(maximum > 1.6 && maximum < 1.8);
});
