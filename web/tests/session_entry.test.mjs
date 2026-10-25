import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionEntry } from '../src/features/session/sessionEntry.ts';
import { hasOpeningContract, isOpeningState } from '../../scripts/dev-contract.mjs';

test('默认只读第一幕，不自动恢复或覆盖后续进度', async () => {
  const calls = [];
  const opening = { id: '', sceneKey: 'mini_arrival' };
  const entry = createSessionEntry(async (url, options) => {
    calls.push([url, options]);
    return opening;
  });
  assert.equal(await entry.opening(), opening);
  assert.deepEqual(calls, [['/api/story/opening', undefined]]);
});

test('开始新局与继续存档使用明确的不同入口', async () => {
  for (const mode of ['new', 'resume']) {
    const calls = [];
    const saved = { id: mode, sceneKey: mode === 'new' ? 'mini_arrival' : 'mini_room' };
    const entry = createSessionEntry(async (url, options) => {
      calls.push([url, options]);
      return saved;
    });
    assert.equal(await entry.enter(mode), saved);
    assert.equal(await entry.enter(mode), saved);
    assert.deepEqual(calls, [
      [mode === 'new' ? '/api/sessions' : '/api/sessions/resume', { method: 'POST' }],
    ]);
  }
});

test('首次并发交互只创建一个会话，失败后可以重试', async () => {
  let finish;
  let calls = 0;
  const entry = createSessionEntry(() => {
    calls++;
    return new Promise((resolve) => (finish = resolve));
  });
  const first = entry.enter();
  const second = entry.enter();
  assert.equal(first, second);
  finish({ id: 'one' });
  assert.deepEqual(await first, { id: 'one' });
  assert.equal(calls, 1);
  let attempts = 0;
  const retry = createSessionEntry(async () => {
    if (++attempts === 1) throw new Error('offline');
    return { id: 'retry' };
  });
  await assert.rejects(retry.enter(), /offline/);
  assert.deepEqual(await retry.enter(), { id: 'retry' });
});

test('dev 拒绝旧服务和任何后续场景，不把 mini 前缀当作第一幕', () => {
  assert.equal(hasOpeningContract({ story: 'mini_script' }), false);
  assert.equal(
    hasOpeningContract({ story: 'mini_script', openingContract: 'mini_arrival_v1' }),
    true,
  );
  const opening = {
    id: '',
    storyMode: true,
    sceneKey: 'mini_arrival',
    room: 'gate',
    sceneText: '大巴停在红烛寺山门前。',
    dialogue: { speaker: '', text: '' },
  };
  assert.equal(isOpeningState(opening), true);
  for (const patch of [
    { id: 'saved' },
    { room: 'watch' },
    { sceneKey: 'mini_register' },
    { storyMode: false },
    { sceneText: '' },
    { dialogue: { speaker: '旁白', text: '大巴停下了。' } },
  ])
    assert.equal(isOpeningState({ ...opening, ...patch }), false);
});
