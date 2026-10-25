import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';

// Load the actual TS/JSON composition modules through the application's Vite
// resolver. This exercises state selection rather than a copied test renderer.
const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false } });
after(() => server.close());
const { authoredScene } = await server.ssrLoadModule('/src/scene/authored_scene/scenes.ts');
const state = (sceneKey, shotKey = '', flags = {}, actors = []) => ({
  sceneKey,
  shotKey,
  flags,
  actors,
  inventory: [],
});

test('半掩房门不会在看到空背前提前显示慧普或床上细节，夜色参数实际传入图层', () => {
  const hidden = authoredScene(state('mini_listen', 'listen_door'));
  assert.ok(!hidden.layers.some((layer) => layer.id.startsWith('hui_')));
  assert.ok(!hidden.layers.some((layer) => layer.id === 'victim_detail' && layer.rect.width > 0));
  const revealed = authoredScene(state('mini_listen', 'listen_skin', { skin_seen: true }));
  assert.equal(
    revealed.layers.find((layer) => layer.id === 'hui_rear').filter,
    'brightness(.53) saturate(.7)',
  );
});

test('三种身份伏到床脚时选择专用跪伏姿势，不旋转或裁断站姿', () => {
  for (const [portrait, id] of [
    ['linlan', 'lin_lan'],
    ['zhouyan', 'zhou_yan'],
    ['xuzhi', 'xu_zhi'],
  ]) {
    const composition = authoredScene(
      state('mini_double', 'double_calm', { red_candle_lit: true }, [
        { id: 'skin_double', portrait, visible: true },
      ]),
    );
    const actor = composition.layers.find((layer) => layer.actorId === 'skin_double');
    assert.ok(actor.src.endsWith(`/${id}/slumped_calm.webp`));
    assert.equal(actor.rotation, undefined);
    assert.equal(actor.clipRect, undefined);
    assert.ok(
      Math.abs(actor.rect.width / actor.rect.height - actor.frame.width / actor.frame.height) <
        0.001,
    );
  }
});

test('白天接待、登记写字、黄昏发烛分别使用相应动作，晚膳具有全部真实菜品', () => {
  const actors = [{ id: 'luchen', visible: true }];
  const reception = authoredScene(state('mini_register', 'register_camera_bell', {}, actors));
  assert.ok(
    reception.layers
      .find((layer) => layer.actorId === 'luchen')
      .src.endsWith('/standing_reception.webp'),
  );
  const writing = authoredScene(state('mini_register', 'register_desk'));
  assert.ok(
    writing.layers.find((layer) => layer.actorId === 'luchen').src.endsWith('/writing_ledger.webp'),
  );
  const candle = authoredScene(state('mini_corridor_candle', 'corridor_candles', {}, actors));
  assert.ok(
    candle.layers.find((layer) => layer.actorId === 'luchen').src.endsWith('/offering_candle.webp'),
  );
  const dining = authoredScene(state('mini_refectory'));
  for (const id of ['bread', 'pickles', 'local_vegetables', 'lu_chen'])
    assert.ok(
      dining.layers.some((layer) => layer.id === id),
      id,
    );
  assert.equal(new Set(dining.layers.map((layer) => layer.id)).size, dining.layers.length);
});

test('当前素材清单的新姿态、菜品与调查近景均有可加载的运行时文件', () => {
  const catalog = JSON.parse(readFileSync('assets/generation/asset_catalog.json', 'utf8'));
  const entries = catalog.assets.filter((asset) =>
    /slumped_calm|writing_ledger|offering_candle|steamed_buns|pickled_vegetables|mushroom_greens|assets\/details\//.test(
      asset.path,
    ),
  );
  assert.equal(entries.length, 11);
  for (const entry of entries) {
    assert.ok(existsSync(entry.path), entry.path);
    assert.ok(
      existsSync(
        entry.path.replace(/^assets\//, 'web/public/art/story/').replace(/\.png$/, '.webp'),
      ),
      entry.path,
    );
  }
});
