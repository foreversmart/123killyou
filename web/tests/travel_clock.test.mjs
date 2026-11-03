import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

async function fixture() {
  const runtime = hookRuntime();
  const useTravelClock = await loadHook(
    '../../src/scene/story_transition/useTravelClock.ts',
    'useTravelClock',
    runtime,
  );
  const styles = {};
  let finished = 0;
  const options = {
    phaseKey: 'dawn_walk_bus:0',
    durationMs: 12000,
    ready: true,
    paused: false,
    onComplete: () => finished++,
  };
  return {
    runtime,
    options,
    styles,
    get finished() {
      return finished;
    },
    render() {
      const clock = runtime.render(useTravelClock, options);
      clock.overlay.current = { style: { setProperty: (key, value) => (styles[key] = value) } };
      return clock;
    },
  };
}

test('上车镜头只按已绘制时间结束，暂停与隐藏期间不会提前淡完或重新计时', async () => {
  const f = await fixture();
  let clock = f.render();
  clock.onElapsed(5.2);
  assert.equal(f.styles['--travel-elapsed'], '-5200ms');
  f.options.paused = true;
  clock = f.render();
  clock.onElapsed(5.2);
  f.runtime.flushTimers();
  assert.equal(f.finished, 0, '墙钟流逝不会结束尚未上车的镜头');
  assert.equal(f.styles['--travel-elapsed'], '-5200ms', '暂停时字幕和淡出停在同一帧');

  f.options.paused = false;
  clock = f.render();
  clock.onElapsed(11.2);
  assert.equal(f.finished, 0, '最后一人刚上车时仍保留尾帧');
  clock.onElapsed(12);
  assert.equal(f.finished, 1, '恢复后按剩余渲染时间结束');
  clock.onElapsed(12.05);
  assert.equal(f.finished, 1, '不会因下一帧重复切换场景');
  f.runtime.dispose();
});

test('下一段镜头使用新的渲染时钟，并等待画面就绪后结束', async () => {
  const f = await fixture();
  f.render().onElapsed(12);
  f.options.phaseKey = 'register_walk_refectory:1';
  f.options.durationMs = 11400;
  f.options.ready = false;
  let clock = f.render();
  clock.onElapsed(0);
  assert.equal(f.styles['--travel-elapsed'], '0ms', '新镜头重新从不透明的起始帧开始');
  clock.onElapsed(11.4);
  assert.equal(f.finished, 1, '尚未就绪不会推进');
  f.options.ready = true;
  clock = f.render();
  clock.onElapsed(11.4);
  assert.equal(f.finished, 2, '新一段可以独立完成');
  f.runtime.dispose();
});
