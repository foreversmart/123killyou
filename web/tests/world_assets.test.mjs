import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import sharp from 'sharp';

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
const data = await readFile(new URL(manifest.binary, root));
const binary = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { terrainHeight } = await import('../src/scene/world_environment/terrain.ts');
const { roadSample, roadNearest, ROAD_HALF_WIDTH, ROAD_LENGTH } =
  await import('../src/scene/world_environment/road_path.ts');
const { bodhisattva } = await import('../src/scene/world_environment/statue.ts');
const { visibleActors } = await import('../src/scene/world/scene_state.ts');

test('packed models contain bounded finite geometry, valid normals, local texture slots and indices', () => {
  const ranges = [];
  for (const [id, m] of Object.entries(manifest.meshes)) {
    assert.equal(m.vertexCount % 16, 0, id);
    assert.equal(m.indexCount % 3, 0, id);
    assert.ok(m.vertexOffset >= 0 && m.vertexOffset % 4 === 0, id);
    assert.equal(m.indexOffset, m.vertexOffset + m.vertexCount * 4, id);
    const end = m.indexOffset + m.indexCount * 4;
    assert.ok(end <= binary.byteLength, id);
    ranges.push([m.vertexOffset, end]);
    const vertices = new Float32Array(binary, m.vertexOffset, m.vertexCount);
    const indices = new Uint32Array(binary, m.indexOffset, m.indexCount);
    assert.ok(vertices.every(Number.isFinite), id);
    assert.ok(
      indices.every((i) => i < vertices.length / 16),
      id,
    );
    for (let i = 0; i < vertices.length; i += 16) {
      assert.ok(Math.hypot(...vertices.subarray(i, i + 3)) < 20, id);
      assert.ok(Math.abs(Math.hypot(...vertices.subarray(i + 3, i + 6)) - 1) < 0.02, id);
      const slot = vertices[i + 11] - 16;
      assert.ok(Number.isInteger(slot) && slot >= 0 && slot < manifest.surfaces.length, id);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  assert.equal(ranges[0][0], 0);
  ranges.slice(1).forEach((range, i) => assert.equal(range[0], ranges[i][1]));
  assert.equal(ranges.at(-1)[1], binary.byteLength);
});

test('every manifest texture is local, decodable and current with no orphan revisions', async () => {
  const textures = [
    ...manifest.skies,
    ...manifest.surfaces.flatMap((s) => [s.albedo, s.normal, s.arm]),
  ];
  const characterFiles = Object.values(manifest.characterModels || {}).flatMap((model) =>
    [model.animationSource, model.skin?.influences].filter(Boolean),
  );
  const files = ['library.json', manifest.binary, ...new Set(characterFiles), ...textures];
  assert.equal(files.length, new Set(files).size);
  assert.deepEqual((await readdir(root)).sort(), files.sort());
  await Promise.all(
    textures.map(async (file) => {
      assert.match(file, /^[a-z0-9_]+\.webp$/);
      const image = await sharp(await readFile(new URL(file, root))).metadata();
      assert.equal(image.width, manifest.skies.includes(file) ? 2048 : 512, file);
      assert.equal(image.height, manifest.skies.includes(file) ? 1024 : 512, file);
    }),
  );
  for (const id of ['linlan_hair', 'xuzhi_hair', 'zhouyan_hair']) {
    const surface = manifest.surfaces.find((s) => s.id === id);
    const { data, info } = await sharp(await readFile(new URL(surface.albedo, root)))
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4, id);
    let transparent = false,
      opaque = false;
    for (let i = 3; i < data.length; i += 4) {
      transparent ||= data[i] < 100;
      opaque ||= data[i] > 200;
    }
    assert.ok(transparent && opaque, id);
  }
});

test('current material slots resolve packed characters and sculpted architecture without retired flora', async () => {
  for (const id of Object.keys(manifest.meshes))
    assert.doesNotMatch(id, /^(tree|tree_far|fern\d*|grass\d*)$/);
  for (const surface of manifest.surfaces)
    assert.doesNotMatch(surface.id, /^(tree_\d+|fern_\d+|grass_\d+)$/);
  const { templePaint, templeRelief } =
    await import('../src/scene/world_environment/temple_palette.ts');
  const { gilt, shadowGold, guardianPalette } =
    await import('../src/scene/world_environment/guardian_materials.ts');
  for (const [material, id] of [
    [templePaint, 'temple_paint'],
    [templeRelief, 'temple_relief'],
    [gilt, 'guardian_gilding'],
    [shadowGold, 'guardian_clouds'],
    [guardianPalette('sword').skin, 'guardian_pigment'],
  ])
    assert.equal(manifest.surfaces[material.pattern - 16].id, id);
  for (const [id, model] of Object.entries(manifest.characterModels)) {
    assert.equal(manifest.surfaces[model.surface].id, id + '_model');
    for (const part of model.parts) {
      const range = manifest.meshes[part];
      const vertices = new Float32Array(binary, range.vertexOffset, range.vertexCount);
      for (let i = 11; i < vertices.length; i += 16)
        assert.ok(manifest.surfaces[vertices[i] - 16].id.startsWith(id + '_model'), part);
    }
  }
});

test('all character poses and the statue resolve current meshes with head and neck bounds in meters', () => {
  const visit = (n) => {
    if (n.asset) assert.ok(manifest.meshes[n.asset], n.asset);
    n.children.forEach(visit);
  };
  for (const id of ['linlan', 'zhouyan', 'xuzhi', 'luchen', 'huipu', 'shangong', 'zhaoxi']) {
    for (const pose of ['standing', 'seated', 'kneeling']) visit(characterModel(id, pose).root);
    visit(characterModel(id, 'standing', true).root);
  }
  visit(bodhisattva([0, 0, 0]));
  for (const [id, m] of Object.entries(manifest.meshes).filter(
    ([id]) => id.endsWith('_head') && !id.includes('_model_'),
  )) {
    const v = new Float32Array(binary, m.vertexOffset, m.vertexCount);
    let min = Infinity,
      max = -Infinity;
    for (let i = 1; i < v.length; i += 16) {
      min = Math.min(min, v[i]);
      max = Math.max(max, v[i]);
    }
    assert.ok(min > -0.5 && min < -0.1 && max > 0.14 && max < 0.19, id);
  }
});

test('current character models expose one packed skin mesh or six static parts', () => {
  const expected = ['huipu', 'linlan', 'luchen', 'xuzhi', 'zhaoxi', 'zhouyan'];
  assert.deepEqual(Object.keys(manifest.characterModels || {}).sort(), expected);
  for (const [id, model] of Object.entries(manifest.characterModels)) {
    const skinned = Boolean(model.skin);
    assert.equal(model.static, !skinned, id);
    assert.equal(model.parts.length, skinned ? 1 : 6, id);
    if (skinned) {
      assert.equal(model.skin.mesh, model.parts[0]);
      assert.ok(model.skin.influences.endsWith('_skin.bin'), id);
      assert.deepEqual(
        Object.keys(manifest.meshes).filter((part) => part.startsWith(id + '_model_')),
        model.parts,
      );
    } else assert.equal(model.skin, undefined, id);
    for (const part of model.parts) {
      assert.ok(manifest.meshes[part], part);
      const range = manifest.meshes[part];
      const vertices = new Float32Array(binary, range.vertexOffset, range.vertexCount);
      assert.ok(vertices.every(Number.isFinite), part);
      assert.ok(
        vertices.every((value, index) => (index % 16 < 3 ? Math.abs(value) < 3 : true)),
        part,
      );
    }
  }
});

test('the first-person player is rendered only during the bed sleep interlude', () => {
  const player = {
    id: 'player',
    name: '赵熙',
    role: '游客·主角',
    position: '门房床上',
    portrait: 'player',
    status: '躺下休息',
    visible: true,
  };
  const sleeping = {
    sceneKey: 'mini_wake_three_gongs',
    shotKey: 'room_sleep_wait',
    flags: {},
    actors: [player],
  };
  assert.deepEqual(
    visibleActors(sleeping).map((actor) => actor.id),
    ['player'],
  );
  assert.deepEqual(
    visibleActors({ ...sleeping, shotKey: 'wake_candle' }).map((actor) => actor.id),
    [],
  );
});

test('半山寺院平台平整，盘山路基随高程变化且留足通车宽度', () => {
  for (let z = -62; z <= 12; z += 2)
    for (let x = -32; x <= 32; x += 2)
      assert.ok(Math.abs(terrainHeight(x, z) + 0.16) < 1e-8, `寺院平台 ${x},${z}`);
  let turns = 0,
    previousDirection = 0;
  for (let d = 1; d < ROAD_LENGTH - 1; d += 3) {
    const center = roadSample(d),
      direction = Math.sign(Math.sin(center.yaw));
    assert.ok(center.position[1] <= 0.01, '到寺前平地时高程不因样条超调隆起');
    if (previousDirection && direction !== previousDirection) turns++;
    previousDirection = direction;
    for (const offset of [-ROAD_HALF_WIDTH, 0, ROAD_HALF_WIDTH]) {
      const [x, , z] = roadSample(d, offset).position;
      const nearest = roadNearest(x, z);
      assert.ok(
        Math.abs(terrainHeight(x, z) - (nearest.height - 0.16)) < 1e-8,
        `两侧路基紧贴对应高程：distance=${d}, offset=${offset}, x=${x}, z=${z}`,
      );
      assert.equal(terrainHeight(x, z), terrainHeight(x, z, true), '山门和山路共用地形');
    }
  }
  assert.ok(turns >= 3, '公路多次跨坡折返');
  assert.ok(roadSample(ROAD_LENGTH).position[1] - roadSample(0).position[1] > 30, '公路从山谷爬升');
});

test('群山高于半山寺院，前方谷地更低且坡面连续', () => {
  let peak = -Infinity,
    valley = Infinity;
  for (let z = -400; z <= 220; z += 10)
    for (let x = -320; x <= 320; x += 10) {
      const h = terrainHeight(x, z);
      assert.ok(Number.isFinite(h));
      assert.ok(Math.abs(terrainHeight(x + 0.001, z) - h) < 0.03, `东西坡面连续 ${x},${z}`);
      assert.ok(Math.abs(terrainHeight(x, z + 0.001) - h) < 0.03, `南北坡面连续 ${x},${z}`);
      if (z < -62) peak = Math.max(peak, h);
      if (z > 70 && Math.abs(x) < 100) valley = Math.min(valley, h);
    }
  for (const z of [-62, 11, 12, 175])
    for (let x = -40; x <= 40; x += 2)
      assert.ok(
        Math.abs(terrainHeight(x, z - 0.001) - terrainHeight(x, z + 0.001)) < 0.03,
        `平台及路基边界连续 ${x},${z}`,
      );
  assert.ok(peak > 100, '寺后高山形成山脊');
  assert.ok(valley < -20, '寺前谷地体现半山高度');
});
