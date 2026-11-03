import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false } });
after(() => server.close());
const { ArrivalInteraction } = await server.ssrLoadModule('/src/scene/arrival/index.tsx');
const render = (shotKey, extra = {}) =>
  renderToStaticMarkup(
    createElement(ArrivalInteraction, {
      state: {
        sceneKey: 'mini_arrival',
        shotKey,
        sceneText: '旧匾露出“明照寺”。',
        dialogue: { text: '' },
        ...extra,
      },
      onAction: async () => {},
      interactive: true,
    }),
  );

test('山门和个人物品观察会在原画面显示实际线索，并保留行动按钮', () => {
  for (const shot of [
    'arrival_plaque',
    'arrival_cat',
    'arrival_inner',
    'register_camera_bell',
    'register_drag_mark',
    'register_ribbon',
    'room_key',
    'room_beads',
    'room_permit',
    'room_oil_lamp',
  ]) {
    const markup = render(shot);
    assert.match(markup, /role="status" aria-atomic="true">旧匾露出“明照寺”。<\/p>/, shot);
    assert.match(markup, /听听他们在说什么/);
    assert.match(markup, /我先去登记入住/);
  }
});

test('对白、普通参观状态和空观察不重复显示场景说明', () => {
  for (const markup of [
    render('arrival_inner', { dialogue: { text: '登记室的门已经打开，大家跟紧。' } }),
    render('arrival_weather'),
    render('arrival_plaque', { sceneKey: 'mini_register' }),
    render('arrival_plaque', { sceneText: '   ' }),
  ]) {
    assert.doesNotMatch(markup, /旧匾露出/);
    assert.match(markup, /role="status" aria-atomic="true"><\/p>/);
  }
});
