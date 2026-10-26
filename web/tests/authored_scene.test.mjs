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

test('偷看偏房用完整暗室图，打碎花瓶时切换同机位回头图', () => {
  for (const [scene, shot, flags, file] of [
    ['mini_listen', 'listen_door', {}, 'room_night'],
    ['mini_listen', 'listen_skin', { skin_seen: true }, 'room_night'],
    ['mini_listen', 'listen_vase', { skin_seen: true }, 'room_turning'],
    ['mini_listen', 'listen_cat', { vase_broken: true }, 'room_turning'],
    ['mini_death', 'death_mini_listen', { vase_broken: true }, 'room_turning'],
  ]) {
    const composition = authoredScene(state(scene, shot, flags));
    assert.equal(composition.layers.length, 1);
    const [image] = composition.layers;
    assert.ok(image.src.endsWith(`/guest_room/${file}.webp`));
    assert.equal(image.actorId, undefined);
    assert.equal(image.motion, undefined);
    assert.equal(image.filter, undefined);
    assert.deepEqual(image.rect, { x: 0, y: 0, width: 1672, height: 941 });
  }
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

test('白天接待与登记写字使用专用动作，回廊发烛使用完整群像', () => {
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
  assert.equal(candle.layers.length, 1);
  assert.match(candle.layers[0].src, /east_courtyard\/candle_distribution\.webp$/);
});

test('拖痕调查停留在登记室门槛，并显示周砚观察动作', () => {
  const drag = authoredScene(state('mini_register', 'register_drag_mark'));
  assert.ok(
    drag.layers.some((layer) => layer.src.endsWith('/registration/registration_afternoon.webp')),
  );
  const zhouYan = drag.layers.find((layer) => layer.actorId === 'zhouyan');
  assert.ok(zhouYan);
  assert.equal(zhouYan.id, 'actor_zhou_yan_registration');
  assert.ok(
    Math.abs(
      zhouYan.rect.width / zhouYan.rect.height - zhouYan.frame.width / zhouYan.frame.height,
    ) < 0.001,
  );
});

test('场景人物使用与当前动作匹配的微动，背景和静物不会跟着人物一起晃动', () => {
  const writing = authoredScene(state('mini_register', 'register_desk'));
  assert.equal(writing.layers.find((layer) => layer.id === 'actor_lu_chen').motion, 'still');
  assert.equal(writing.layers.find((layer) => layer.id === 'writing_palm').motion, 'still');
  assert.deepEqual(
    writing.layers
      .filter((layer) => layer.actorId === 'luchen' && layer.motion !== 'still')
      .map((layer) => layer.id),
    ['writing_brush'],
  );

  const dining = authoredScene(state('mini_refectory'));
  assert.equal(dining.layers.find((layer) => layer.id === 'background').motion, undefined);
  assert.equal(dining.layers.length, 1);

  const corridor = authoredScene(
    state('mini_corridor_candle', 'corridor_candles', {}, [{ id: 'luchen', visible: true }]),
  );
  assert.equal(corridor.layers.length, 1);
  assert.equal(corridor.layers[0].motion, undefined);

  const gate = authoredScene(state('mini_dawn', 'dawn_gate'));
  assert.equal(gate.layers.find((layer) => layer.id === 'lin_lan').motion, 'walk');
});

test('所有死亡来源保留所在环境并清除人物、尸体和重复鬼影图层', () => {
  for (const source of [
    'mini_room',
    'mini_wake_three_gongs',
    'mini_four_knocks',
    'mini_three_knocks',
    'mini_listen',
    'mini_oracle',
    'mini_double',
    'mini_dawn_trap',
  ]) {
    for (const withShot of [true, false]) {
      const death = authoredScene({
        ...state(
          'mini_death',
          withShot ? `death_${source}` : '',
          {
            skin_seen: true,
            vase_broken: true,
            cup_failed: true,
            red_candle_lit: true,
            double_frenzy: true,
          },
          [{ id: 'skin_double', portrait: 'zhouyan', visible: true }],
        ),
        retryScene: source,
      });
      assert.ok(death.layers.length > 0, source);
      assert.ok(
        !death.layers.some(
          (layer) =>
            layer.actorId || /intrusion|victim|hui_|elder_|double_|familiar_|calm_/.test(layer.id),
        ),
        source,
      );
      const directory =
        source === 'mini_listen'
          ? 'guest_room'
          : source === 'mini_oracle'
            ? 'east_shrine'
            : 'player_room';
      assert.ok(
        death.layers.some((layer) => layer.src.includes(`/scenes/${directory}/`)),
        source,
      );
    }
  }
});

test('死亡只叠加一个现有鬼影和血泊，保留重试及重新开始操作', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const { DeathFeedback } = await server.ssrLoadModule('/src/scene/death_feedback/index.tsx');
  const { sceneChoices } = await server.ssrLoadModule('/src/scene/story_stage/choices.ts');
  const death = {
    ...state('mini_death', 'death_mini_four_knocks'),
    runId: 'death-test',
    retryScene: 'mini_four_knocks',
  };
  const markup = renderToStaticMarkup(createElement(DeathFeedback, { state: death }));
  assert.equal((markup.match(/data-death-ghost=/g) || []).length, 1);
  assert.equal((markup.match(/data-death-blood=/g) || []).length, 1);
  assert.ok(markup.includes('/props/intrusion_shadow.webp'));
  assert.ok(!markup.includes('data-death-figure'));
  assert.equal(sceneChoices(death).length, 2);
  assert.ok(sceneChoices(death).some((choice) => /重试/.test(choice.command)));
  assert.ok(sceneChoices(death).some((choice) => /重新开始/.test(choice.command)));
});

test('陆沉望向帘后的镜头只转动头部，身体静止且不会揭开帘后人物', () => {
  const ordinary = authoredScene(state('mini_refectory', 'refectory_table'));
  const glance = authoredScene(state('mini_refectory', 'refectory_glance'));
  const body = glance.layers.find((layer) => layer.id === 'lu_chen');
  const head = glance.layers.find((layer) => layer.id === 'lu_chen_glance_head');
  assert.equal(body.motion, 'still');
  assert.equal(head.motion, 'glance');
  assert.ok(head.rect.height < body.rect.height / 4);
  assert.ok(head.rect.y + head.rect.height > body.clipRect.y);
  assert.equal(head.motionOrigin.y, body.clipRect.y);
  assert.ok(head.motionOrigin.x > head.rect.x);
  assert.ok(head.motionOrigin.x < head.rect.x + head.rect.width);
  assert.deepEqual(
    glance.layers.find((layer) => layer.id === 'curtain_presence'),
    ordinary.layers.find((layer) => layer.id === 'curtain_presence'),
  );
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

test('晚膳所有分镜与四人各自的进食选择共用同一完整插画', () => {
  const baseline = authoredScene(state('mini_refectory'));
  assert.equal(baseline.layers.length, 1);
  assert.match(baseline.layers[0].src, /dining_hall\/dining_sunset\.webp$/);
  assert.deepEqual(baseline.labels, []);
  for (const shot of [
    'refectory_table',
    'refectory_porridge',
    'refectory_eating',
    'refectory_lamp',
    'refectory_bread',
    'refectory_curtain',
  ]) {
    for (let mask = 0; mask < 16; mask++) {
      const flags = Object.fromEntries(
        ['player', 'linlan', 'zhouyan', 'xuzhi'].map((id, i) => [
          `meal_${id}_ate`,
          Boolean(mask & (1 << i)),
        ]),
      );
      assert.deepEqual(authoredScene(state('mini_refectory', shot, flags)), baseline);
    }
  }
});

test('下午山门不会重复叠加已绘入的人物、猫或行李，晨间仍有独立图层', async () => {
  const { composeLayout } = await server.ssrLoadModule('/src/scene/authored_scene/compose.ts');
  const gate = JSON.parse(readFileSync('assets/scenes/temple_gate/layout.json', 'utf8'));
  const arrival = composeLayout(gate, 'temple_gate', {
    time: 'afternoon',
    bags: true,
    cat: true,
    companions: true,
    keeper: true,
  });
  assert.deepEqual(
    arrival.layers.map((layer) => layer.id),
    ['afternoon'],
  );
  assert.match(arrival.layers[0].src, /temple_gate\/gate_afternoon\.webp$/);
  assert.ok(
    authoredScene(state('mini_dawn', 'dawn_gate')).layers.some((layer) => layer.id === 'lin_lan'),
  );
});

test('发烛与叮嘱共用完整插画，领取旗标和在场人物不会重新叠加蜡烛或立绘', () => {
  const baseline = authoredScene(state('mini_corridor_candle', 'corridor_candles'));
  assert.equal(baseline.layers.length, 1);
  assert.deepEqual(baseline.labels, []);
  for (const shot of ['corridor_candles', 'corridor_warning', 'corridor_two_gongs']) {
    for (const held of [false, true]) {
      assert.deepEqual(
        authoredScene(
          state(
            'mini_corridor_candle',
            shot,
            { red_candle_held: held },
            ['luchen', 'player', 'linlan', 'zhouyan', 'xuzhi'].map((id) => ({ id, visible: true })),
          ),
        ),
        baseline,
      );
    }
  }
});

test('独处门房只用一张含主角的完整图，烛火状态切换整图而不叠加人物或道具', () => {
  for (const scene of ['mini_room', 'mini_four_knocks', 'mini_three_knocks', 'mini_dawn_trap']) {
    for (const lit of [false, true]) {
      const composition = authoredScene(
        state(scene, 'room_table', { red_candle_lit: lit, red_candle_held: true }, [
          { id: 'player', visible: true },
        ]),
      );
      assert.equal(composition.layers.length, 1);
      assert.match(
        composition.layers[0].src,
        new RegExp('player_room/room_seated_' + (lit ? 'lit' : 'unlit') + '\\.webp$'),
      );
      assert.equal(composition.layers[0].actorId, undefined);
      assert.equal(composition.layers[0].motion, undefined);
      assert.deepEqual(composition.labels, []);
    }
  }
});

test('三更固定显示熄灭的完整图，门眼调查仍使用专用画面', () => {
  for (const lit of [false, true]) {
    const wake = authoredScene(
      state('mini_wake_three_gongs', 'wake_candle', { red_candle_lit: lit }),
    );
    assert.equal(wake.layers.length, 1);
    assert.match(wake.layers[0].src, /room_seated_unlit\.webp$/);
  }
  const peephole = authoredScene(state('mini_four_knocks', 'four_peephole'));
  assert.match(peephole.layers[0].src, /peephole_empty\.webp$/);
});
