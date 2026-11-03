import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false } });
after(() => server.close());
const { StoryTransition } = await server.ssrLoadModule('/src/scene/story_transition/index.tsx');

const render = (shotKey, flags = {}) =>
  renderToStaticMarkup(
    createElement(StoryTransition, {
      state: { sceneKey: 'mini_wake_three_gongs', shotKey, flags },
      phase: 'idle',
    }),
  );

test('首次入睡先完整展示床边动作，最后才在原房间上渐黑', () => {
  for (const flags of [
    { sleep_pending: true },
    { sleep_pending: true, debug_scene_skipped: true },
  ]) {
    const markup = render('room_sleep_wait', flags);
    assert.match(markup, /data-transition="room_sleep_blackout"/);
    assert.match(markup, /--sleep-darken-delay:5400ms/);
    assert.match(markup, /--sleep-darken-duration:1200ms/);
    assert.doesNotMatch(markup, /canvas|data-world|role="status"/);
  }
});

test('三更惊醒后不保留入睡黑场', () => {
  assert.equal(render('wake_candle'), '');
});
