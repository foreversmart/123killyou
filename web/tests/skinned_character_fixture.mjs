import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { mat4, quat, vec3 } from 'wgpu-matrix';

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

const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const metadata = manifest.characterModels.linlan.skin;
const range = manifest.meshes[metadata.mesh];
const vertexCount = range.vertexCount / 16;
const bytes = await readFile(new URL(metadata.influences, root));
const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { parseBlenderAnimations, blenderClipFor, applyBlenderPose } =
  await import('../src/scene/world_character/blender_action_library.ts');
const { extractZipEntry } = await import('../src/shared/lib/zip.ts');
const { node } = await import('../src/scene/world/types.ts');
const skin = decodeCharacterSkin(metadata, binary, vertexCount);
const clipBytes = await readFile(new URL(manifest.characterModels.linlan.animationSource, root));
const clipData = await extractZipEntry(
  clipBytes.buffer.slice(clipBytes.byteOffset, clipBytes.byteOffset + clipBytes.byteLength),
);
const animations = parseBlenderAnimations(clipData);
const packed = await readFile(new URL(manifest.binary, root));
const meshData = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength);
const vertices = new Float32Array(meshData, range.vertexOffset, range.vertexCount);
const indices = new Uint32Array(meshData, range.indexOffset, range.indexCount);

function localMatrix(target) {
  if (target.matrix) return target.matrix;
  let matrix = mat4.translation(target.position);
  matrix = mat4.rotateY(matrix, target.rotation[1]);
  matrix = mat4.rotateX(matrix, target.rotation[0]);
  matrix = mat4.rotateZ(matrix, target.rotation[2]);
  return mat4.scale(matrix, target.scale);
}

function worldMatrix(root, target, parent = mat4.identity()) {
  const matrix = mat4.multiply(parent, localMatrix(root));
  if (root === target) return matrix;
  for (const child of root.children) {
    const found = worldMatrix(child, target, matrix);
    if (found) return found;
  }
}

function bonePoint(rig, name, world = false, sole = false) {
  const index = skin.skeleton.bones.findIndex((bone) => bone.name === name);
  const matrix = rig.root.skinTargets.mesh.skinMatrices.subarray(index * 16, index * 16 + 16);
  const position = [...skin.skeleton.bones[index].position];
  if (sole) {
    position[1] = 0;
    position[2] += 0.03;
  }
  const point = vec3.transformMat4(position, matrix);
  return world ? vec3.transformMat4(point, localMatrix(rig.root)) : point;
}

function handPropPoint(rig, suffix, offset) {
  const bones = skin.skeleton.bones;
  const hand = bones.findIndex((bone) => bone.name === 'hand.' + suffix);
  const forearm = bones.find((bone) => bone.name === 'forearm.' + suffix);
  const source = vec3.normalize(vec3.subtract(bones[hand].position, forearm.position));
  const align = mat4.fromQuat(quat.rotationTo(source, vec3.normalize([0, -0.28, -0.005])));
  const rest = vec3.add(
    bones[hand].position,
    vec3.transformMat4Upper3x3(offset, mat4.inverse(align)),
  );
  const palette = rig.root.skinTargets.mesh.skinMatrices.subarray(hand * 16, hand * 16 + 16);
  return vec3.transformMat4(vec3.transformMat4(rest, palette), localMatrix(rig.root));
}

function setup(pose, shotKey, flags = {}, options = {}, actorID = 'linlan') {
  const rig = characterModel('linlan', pose);
  const actor = { id: actorID, name: '林岚', visible: true };
  const state = { sceneKey: shotKey.startsWith('arrival_') ? 'mini_arrival' : '', shotKey, flags };
  const animation = animateCharacter(rig, actor, state, options);
  rig.root.blenderEnabled = Boolean(
    rig.root.blenderAction && blenderClipFor(rig.root.blenderAction, animations),
  );
  const update = createSkinPose(rig.root.skinTargets, skin.skeleton, { vertices, indices, skin });
  update();
  return {
    rig,
    animation,
    frame(time) {
      rig.root.animate(time, 1 / 60);
      if (rig.root.blenderEnabled && rig.root.blenderAction)
        applyBlenderPose(rig.root.blenderAction, time, animations, rig.root.blenderTargets);
      update();
      assert.ok(rig.root.skinTargets.mesh.skinMatrices.every(Number.isFinite));
    },
  };
}

function skinPosition(vertex, palette) {
  const point = vertices.subarray(vertex * 16, vertex * 16 + 3);
  const result = [0, 0, 0];
  for (let slot = 0; slot < 4; slot++) {
    const index = vertex * 4 + slot;
    const bone = skin.joints[index];
    const transformed = vec3.transformMat4(point, palette.subarray(bone * 16, bone * 16 + 16));
    for (let axis = 0; axis < 3; axis++) result[axis] += transformed[axis] * skin.weights[index];
  }
  return result;
}

export {
  binary,
  metadata,
  decodeCharacterSkin,
  vertexCount,
  skin,
  range,
  vertices,
  indices,
  setup,
  bonePoint,
  handPropPoint,
  worldMatrix,
  skinPosition,
  node,
  createSkinPose,
};
