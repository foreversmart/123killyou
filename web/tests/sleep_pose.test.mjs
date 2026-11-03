import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mat4, vec3 } from 'wgpu-matrix';

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
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const { actorMovement, movementPosition } = await import('../src/scene/world/movement.ts');
const { ROOM_SLEEP_WALK_SECONDS, ROOM_SLEEP_ACTION_SECONDS } =
  await import('../src/shared/lib/story_timing.ts');
const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const metadata = manifest.characterModels.zhaoxi.skin;
const range = manifest.meshes[metadata.mesh];
const packed = await readFile(new URL('library.bin', root));
const vertices = new Float32Array(
  packed.buffer,
  packed.byteOffset + range.vertexOffset,
  range.vertexCount,
);
const influences = await readFile(new URL(metadata.influences, root));
const skin = decodeCharacterSkin(
  metadata,
  influences.buffer.slice(influences.byteOffset, influences.byteOffset + influences.byteLength),
  vertices.length / 16,
);
const geometry = {
  vertices,
  skin,
  indices: new Uint32Array(packed.buffer, packed.byteOffset + range.indexOffset, range.indexCount),
};

function setup() {
  const rig = characterModel('zhaoxi');
  const update = createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
  const actor = { id: 'player', name: '赵熙', portrait: 'player', visible: true };
  const state = { sceneKey: 'mini_wake_three_gongs', shotKey: 'room_sleep_wait', flags: {} };
  const movement = actorMovement(actor, state, 'story', [0, 0, 0]);
  rig.root.position = [...movement.from];
  rig.root.rotation[1] = Math.PI;
  animateCharacter(rig, actor, state, { walkDuration: movement.duration });
  let world;
  function frame(time) {
    rig.root.position = movementPosition(movement, time);
    rig.root.rotation[1] = Math.PI;
    rig.root.animate(time, 1 / 60);
    update();
    world = mat4.scale(
      mat4.rotateY(mat4.translation(rig.root.position), rig.root.rotation[1]),
      rig.root.scale,
    );
    assert.ok(rig.root.skinTargets.mesh.skinMatrices.every(Number.isFinite));
  }
  function bone(name) {
    const index = skin.skeleton.bones.findIndex((bone) => bone.name === name);
    const palette = rig.root.skinTargets.mesh.skinMatrices;
    return Array.from(
      vec3.transformMat4(
        vec3.transformMat4(
          skin.skeleton.bones[index].position,
          palette.subarray(index * 16, index * 16 + 16),
        ),
        world,
      ),
    );
  }
  function bounds() {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    const palette = rig.root.skinTargets.mesh.skinMatrices;
    for (let i = 0; i < vertices.length / 16; i++) {
      const point = [0, 0, 0];
      for (let slot = 0; slot < 4; slot++) {
        const influence = i * 4 + slot,
          index = skin.joints[influence] * 16;
        const p = vec3.transformMat4(
          vertices.subarray(i * 16, i * 16 + 3),
          palette.subarray(index, index + 16),
        );
        for (let axis = 0; axis < 3; axis++) point[axis] += p[axis] * skin.weights[influence];
      }
      const p = vec3.transformMat4(point, world);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], p[axis]);
        max[axis] = Math.max(max[axis], p[axis]);
      }
    }
    return { min, max };
  }
  return { rig, frame, bone, bounds };
}

test('the walk to the bed takes twice as long before the lie-down begins', () => {
  const actor = { id: 'player', name: '赵熙', portrait: 'player', visible: true };
  const state = { sceneKey: 'mini_wake_three_gongs', shotKey: 'room_sleep_wait', flags: {} };
  const movement = actorMovement(actor, state, 'story', [0, 0, 0]);
  assert.ok(movement, 'the sleep interlude provides a bed movement');
  assert.equal(movement.duration, 3.2, 'the bed walk duration is doubled from 1.6 seconds');
  assert.notDeepEqual(
    movementPosition(movement, 1.6),
    movement.to,
    'the old one-point-six-second mark no longer reaches the bed',
  );
  assert.deepEqual(
    movementPosition(movement, movement.duration),
    movement.to,
    'the player still reaches the bed before the seated action',
  );
});

test('the actual skin lowers into a stable seated beat before the legs swing onto the mattress', () => {
  const { rig, frame, bone } = setup();
  frame(ROOM_SLEEP_WALK_SECONDS);
  const standingHip = bone('pelvis')[1],
    standingHead = bone('head')[1];
  frame(ROOM_SLEEP_WALK_SECONDS + 0.85);
  const seated = bone('pelvis');
  assert.ok(seated[0] > -2.4 && seated[0] < -2.25, 'hips rest on the near mattress edge');
  assert.ok(seated[1] < standingHip && bone('head')[1] < standingHead, 'sitting lowers the body');
  assert.ok(seated[1] > 0.59 && seated[1] < 0.63, 'hips stay at the seat support height');
  for (const side of ['R', 'L']) {
    const knee = bone('shin.' + side),
      foot = bone('foot.' + side);
    assert.ok(knee[0] > seated[0] + 0.18, 'knees point out from the bedside');
    assert.ok(foot[1] < knee[1] - 0.25, 'lower legs hang down before reclining');
  }
  frame(ROOM_SLEEP_WALK_SECONDS + 1);
  assert.deepEqual(bone('pelvis'), seated, 'sitting is held long enough to read');
  assert.equal(rig.root.rotation[0], 0, 'the rig does not tip around its feet');
});

test('walking, sitting and reclining remain continuous and end supported on the mattress', () => {
  const { rig, frame, bone, bounds } = setup();
  const names = ['pelvis', 'head', 'foot.R', 'foot.L'];
  let previous;
  for (let tick = 0; tick <= Math.ceil((ROOM_SLEEP_ACTION_SECONDS + 0.4) * 60); tick++) {
    frame(tick / 60);
    const points = names.map(bone);
    if (previous && tick / 60 >= ROOM_SLEEP_WALK_SECONDS - 0.05)
      points.forEach((point, i) =>
        assert.ok(vec3.distance(point, previous[i]) < 0.09, `${names[i]} jumps at ${tick / 60}s`),
      );
    assert.equal(rig.root.position[1], 0, 'the whole avatar never jumps up onto the bed');
    previous = points;
  }
  frame(ROOM_SLEEP_ACTION_SECONDS);
  assert.ok(Math.abs(bone('head')[1] - bone('pelvis')[1]) < 0.01, 'the upper body lies flat');
  assert.ok(bone('head')[2] < bone('pelvis')[2] - 0.7, 'head points toward the pillow');
  const { min, max } = bounds();
  assert.ok(
    min[0] > -3.75 && max[0] < -2.25 && min[2] > -2.85 && max[2] < -0.45,
    'the complete skin stays within the mattress',
  );
  assert.ok(min[1] > 0.54 && min[1] < 0.58, 'the back and arms meet the 0.555m mattress surface');
  assert.ok(max[1] < 1, 'the legs and torso finish lying down');
  frame(0);
  assert.equal(rig.root.pelvisSupportHeight, undefined, 'replaying restores ground support');
});
