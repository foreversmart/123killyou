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

const root = new URL('..', import.meta.url);
const loadJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const { extractZipEntry } = await import('../src/shared/lib/zip.ts');
const loadRiggedGlb = async () => {
  const archive = await readFile(new URL('public/art/world/npc_rigged.zip', root));
  const data = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength);
  return Buffer.from(await extractZipEntry(data));
};

test('Blender NPC rig asset is present and all semantic action clips are declared', async () => {
  const glb = await loadRiggedGlb();
  assert.equal(glb.toString('ascii', 0, 4), 'glTF');
  assert.ok(glb.length > 20_000);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(
    glb
      .subarray(20, 20 + jsonLength)
      .toString('utf8')
      .trim(),
  );
  assert.ok(gltf.meshes?.length >= 17);
  assert.ok(gltf.nodes.some((node) => node.mesh !== undefined && node.skin !== undefined));
  assert.ok(gltf.skins?.some((skin) => skin.joints.length >= 18));
  assert.deepEqual(gltf.animations.map((animation) => animation.name).sort(), [
    'eat',
    'night',
    'observe',
    'offer_candle',
    'turn_body',
    'walk',
    'welcome',
    'write',
  ]);
  const manifest = await loadJson('public/art/world/library.json');
  const expected = [
    'walk',
    'welcome',
    'observe',
    'write',
    'eat',
    'offer_candle',
    'night',
    'turn_body',
  ];
  for (const [id, model] of Object.entries(manifest.characterModels)) {
    assert.equal(model.animationSource, 'npc_rigged.zip', id);
    assert.equal(model.rigged, true, id);
    assert.deepEqual(model.animations, expected, id);
  }
});

test('runtime bridge samples Blender clips onto the existing NPC rig targets', async () => {
  const { parseBlenderAnimations, applyBlenderPose } =
    await import('../src/scene/world_character/blender_action_library.ts');
  const { characterModel } = await import('../src/scene/world_character/model.ts');
  const file = await loadRiggedGlb();
  const library = parseBlenderAnimations(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const rig = characterModel('linlan');
  const before = [...rig.arms[0].rotation];
  assert.equal(library.size, 8);
  assert.equal(
    applyBlenderPose('walk', 0.23, library, {
      pose: rig.pose,
      ...rig,
    }),
    true,
  );
  assert.notDeepEqual(rig.arms[0].rotation, before);
});

test('Xu Zhi uses the supplied native skinned model and shared semantic clips', async () => {
  const manifest = await loadJson('public/art/world/library.json');
  const model = manifest.characterModels.xuzhi;
  assert.equal(model.source, 'assets/characters/xu_zhi/xu_zhi.zip');
  assert.equal(model.static, false);
  assert.equal(model.skin.mesh, 'xuzhi_model_skin');
  assert.equal(model.skin.joints.length, 37);
  assert.ok(model.skin.nodes.some((node) => node.name === 'index_02.L'));
  const influences = await readFile(new URL('public/art/world/xuzhi_skin.bin', root));
  const range = manifest.meshes[model.skin.mesh];
  assert.equal(influences.length, (range.vertexCount / 16) * 8 * 4);
  const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
  const skin = decodeCharacterSkin(
    model.skin,
    influences.buffer.slice(influences.byteOffset, influences.byteOffset + influences.byteLength),
    range.vertexCount / 16,
  );
  assert.equal(skin.skeleton.bones.length, 37);
  assert.ok(skin.skeleton.bones.some((bone) => bone.name === 'head'));
  const { characterModel } = await import('../src/scene/world_character/model.ts');
  const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
  const rig = characterModel('xuzhi');
  assert.equal(rig.root.skinTargets.mesh.asset, 'xuzhi_model_skin');
  animateCharacter(
    rig,
    { id: 'xuzhi', name: '许栀', visible: true },
    {
      sceneKey: 'mini_arrival',
      shotKey: 'arrival_gate_beauty',
      flags: {},
    },
  );
  rig.root.animate?.(1.2, 1 / 60);
  assert.ok(Math.abs(rig.head.rotation[1]) > 0.1, 'Xu Zhi keeps looking around the entrance');
});

test('Hui Pu uses the supplied 60-bone model and preserves contact primitives', async () => {
  const manifest = await loadJson('public/art/world/library.json');
  const model = manifest.characterModels.huipu;
  assert.equal(model.source, 'assets/characters/hui_pu/huipu.zip');
  assert.equal(model.static, false);
  assert.equal(model.skin.mesh, 'huipu_model_skin');
  assert.equal(
    model.surface,
    manifest.surfaces.findIndex((surface) => surface.id === 'huipu_model'),
  );
  assert.equal(
    manifest.surfaces.findIndex((surface) => surface.id === 'huipu_model_hidden_palm'),
    30,
  );
  assert.equal(
    manifest.surfaces.findIndex((surface) => surface.id === 'huipu_model_robe_contact_fill'),
    31,
  );
  assert.equal(model.skin.joints.length, 60);
  assert.ok(model.skin.nodes.some((node) => node.name === 'pelvis'));
  assert.ok(model.skin.nodes.some((node) => node.name === 'upper_arm.L'));
  const influences = await readFile(new URL('public/art/world/huipu_skin.bin', root));
  const range = manifest.meshes[model.skin.mesh];
  assert.equal(influences.length, (range.vertexCount / 16) * 8 * 4);
  assert.equal(
    new Set(new Float32Array(await readFile(new URL('public/art/world/huipu_skin.bin', root))))
      .size > 0,
    true,
  );
  const { characterModel } = await import('../src/scene/world_character/model.ts');
  const rig = characterModel('huipu');
  assert.equal(rig.root.skinTargets.mesh.asset, 'huipu_model_skin');
});

test('Zhou Yan uses the replacement 53-bone scan and keeps the fitted legs grounded', async () => {
  const manifest = await loadJson('public/art/world/library.json');
  const model = manifest.characterModels.zhouyan;
  assert.equal(model.source, 'assets/characters/zhou_yan/zhou_yan_rigged.zip');
  assert.equal(model.static, false);
  assert.equal(model.skin.mesh, 'zhouyan_model_skin');
  assert.equal(model.skin.joints.length, 53);
  assert.ok(model.skin.nodes.some((node) => node.name === 'neutral_bone'));
  const range = manifest.meshes[model.skin.mesh];
  const binary = await readFile(new URL('public/art/world/library.bin', root));
  const influences = await readFile(new URL('public/art/world/zhouyan_skin.bin', root));
  const vertices = new Float32Array(
    binary.buffer,
    binary.byteOffset + range.vertexOffset,
    range.vertexCount,
  );
  assert.equal(influences.length, (range.vertexCount / 16) * 8 * 4);
  const { decodeCharacterSkin } = await import('../src/scene/world_character/skin_data.ts');
  const skin = decodeCharacterSkin(
    model.skin,
    influences.buffer.slice(influences.byteOffset, influences.byteOffset + influences.byteLength),
    range.vertexCount / 16,
    vertices,
  );
  const geometry = {
    vertices,
    indices: new Uint32Array(
      binary.buffer,
      binary.byteOffset + range.indexOffset,
      range.indexCount,
    ),
    skin,
  };
  const { characterModel } = await import('../src/scene/world_character/model.ts');
  const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
  const { createSkinPose } = await import('../src/scene/world_character/skin_pose.ts');
  const rig = characterModel('zhouyan');
  const pose = createSkinPose(rig.root.skinTargets, skin.skeleton, geometry);
  pose();
  animateCharacter(
    rig,
    { id: 'zhouyan', name: '周砚', visible: true },
    { sceneKey: 'mini_arrival', shotKey: 'arrival_gate_beauty', flags: {} },
  );
  rig.root.animate?.(0, 0);
  assert.ok(rig.legs.every((leg) => leg.rotation[0] === 0 && leg.bend.angle === 0));
  rig.root.position[2] = 0.56;
  rig.root.animate?.(0.8, 1 / 60);
  assert.ok(rig.legs.some((leg) => Math.abs(leg.rotation[0]) > 0.02 || leg.bend.angle > 0.02));
  pose();
  assert.ok(rig.root.skinTargets.mesh.skinMatrices.every(Number.isFinite));
  const matrices = rig.root.skinTargets.mesh.skinMatrices;
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let vertex = 0; vertex < range.vertexCount / 16; vertex++) {
    const base = vertex * 16;
    let y = 0;
    for (let slot = 0; slot < 4; slot++) {
      const influence = vertex * 4 + slot;
      const matrix = geometry.skin.joints[influence] * 16;
      y +=
        geometry.skin.weights[influence] *
        (matrices[matrix + 1] * geometry.vertices[base] +
          matrices[matrix + 5] * geometry.vertices[base + 1] +
          matrices[matrix + 9] * geometry.vertices[base + 2] +
          matrices[matrix + 13]);
    }
    minimum = Math.min(minimum, y);
    maximum = Math.max(maximum, y);
  }
  assert.ok(minimum > -0.01, `feet remain on the floor: ${minimum}`);
  assert.ok(maximum < 2.1, `native leg axis does not stretch the character: ${maximum}`);
});

test('Zhao Xi uses the complete 53-bone character skin for the bed performance', async () => {
  const manifest = await loadJson('public/art/world/library.json');
  const model = manifest.characterModels.zhaoxi;
  assert.equal(model.source, 'assets/characters/zhao_xi/zhaoxi.zip');
  assert.equal(model.static, false);
  assert.equal(model.skin.mesh, 'zhaoxi_model_skin');
  assert.equal(model.skin.joints.length, 53);
  assert.ok(model.skin.nodes.some((node) => node.name === 'upper_arm.R'));
  assert.ok(model.skin.nodes.some((node) => node.name === 'thigh.L'));
  const influences = await readFile(new URL('public/art/world/zhaoxi_skin.bin', root));
  const range = manifest.meshes[model.skin.mesh];
  assert.equal(influences.length, (range.vertexCount / 16) * 8 * 4);
});
