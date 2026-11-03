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

const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));

test('陆沉使用当前骨骼模型并保留动作所需的语义骨骼', async () => {
  const model = manifest.characterModels.luchen;
  assert.equal(model.static, false);
  assert.equal(model.rigged, true);
  assert.equal(model.source, 'assets/characters/lu_chen/lu_chen.zip');
  assert.equal(model.parts.length, 1);
  assert.equal(model.skin.mesh, model.parts[0]);
  assert.equal(model.skin.influences, 'luchen_skin.bin');
  const names = new Set(model.skin.joints.map((index) => model.skin.nodes[index].name));
  for (const name of [
    'pelvis',
    'spine',
    'chest',
    'head',
    'upper_arm.L',
    'upper_arm.R',
    'forearm.L',
    'forearm.R',
    'hand.L',
    'hand.R',
    'thigh.L',
    'thigh.R',
    'shin.L',
    'shin.R',
    'foot.L',
    'foot.R',
  ])
    assert.ok(names.has(name), name);

  const { characterModel } = await import('../src/scene/world_character/model.ts');
  const rig = characterModel('luchen');
  assert.equal(rig.root.skinTargets.mesh.asset, 'luchen_model_skin');
  assert.equal(rig.root.skinTargets.camera, undefined);
});

test('陆沉骨骼影响文件与打包网格顶点数一致', async () => {
  const model = manifest.characterModels.luchen;
  const range = manifest.meshes[model.skin.mesh];
  const packed = await readFile(new URL(manifest.binary, root));
  const influences = await readFile(new URL(model.skin.influences, root));
  assert.equal(range.vertexCount % 16, 0);
  assert.equal(influences.byteLength, (range.vertexCount / 16) * 8 * 4);
  const vertices = new Float32Array(
    packed.buffer,
    packed.byteOffset + range.vertexOffset,
    range.vertexCount,
  );
  assert.ok(vertices.every(Number.isFinite));
  for (let i = 0; i < vertices.length; i += 16) {
    assert.ok(vertices[i + 1] >= -0.01 && vertices[i + 1] <= 1.75);
    assert.equal(vertices[i + 11], model.surface + 16);
  }
});
