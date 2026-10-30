import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

async function fixture() {
  const runtime = hookRuntime();
  const hook = await loadHook('../../src/app/game/useOpeningFlow.ts', 'useOpeningFlow', runtime);
  return {
    runtime,
    render: () => {
      const flow = runtime.render(hook);
      flow.setJourneyReady(true);
      return runtime.render(hook);
    },
  };
}

test('片头结束停在标题等待开始，随后山路3秒、门口停留4秒，最后交给正片', async () => {
  const f = await fixture();
  let flow = f.render();
  assert.equal(flow.openingPhase, 'reel');
  flow.startOpening();
  assert.equal(f.render().openingPhase, 'reel');
  flow.finishOpeningVideo();
  flow = f.render();
  assert.equal(flow.openingPhase, 'ready');
  assert.deepEqual(f.runtime.pendingDelays, []);
  f.runtime.flushTimers();
  assert.equal(f.render().openingPhase, 'ready');

  flow.startOpening();
  flow = f.render();
  assert.equal(flow.openingPhase, 'road');
  assert.deepEqual(f.runtime.pendingDelays, [3000]);
  f.runtime.flushTimers();
  flow = f.render();
  assert.equal(flow.openingPhase, 'alighting');
  assert.deepEqual(f.runtime.pendingDelays, [4000]);
  f.runtime.flushTimers();
  assert.equal(f.render().openingPhase, 'done');
  assert.equal(f.runtime.pendingTimers, 0);
  f.runtime.dispose();
});

test('点击和语音重复开始、延迟到达的片尾事件均不重启或跳过镜头', async () => {
  const f = await fixture();
  const flow = f.render();
  flow.finishOpeningVideo();
  f.render();
  flow.startOpening();
  flow.startOpening();
  flow.finishOpeningVideo();
  assert.equal(f.render().openingPhase, 'road');
  assert.deepEqual(f.runtime.pendingDelays, [3000]);
  f.runtime.flushTimers();
  flow.startOpening();
  flow.finishOpeningVideo();
  assert.equal(f.render().openingPhase, 'alighting');
  assert.deepEqual(f.runtime.pendingDelays, [4000]);
  f.runtime.flushTimers();
  flow.startOpening();
  flow.finishOpeningVideo();
  assert.equal(f.render().openingPhase, 'done');
  f.runtime.dispose();
});

test('镜头播放中卸载会取消转场，不在退出后启动正片', async () => {
  const f = await fixture();
  const flow = f.render();
  flow.finishOpeningVideo();
  f.render();
  flow.startOpening();
  f.render();
  f.runtime.dispose();
  assert.equal(f.runtime.pendingTimers, 0);
  f.runtime.flushTimers();
  assert.equal(flow.openingGate.current, 'road');
});
