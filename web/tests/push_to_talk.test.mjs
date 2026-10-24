import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPushToTalk } from '../src/features/voice/pushToTalk.ts';

const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const takes = [],
    submitted = [],
    problems = [],
    states = [];
  let interrupts = 0;
  const capture = createPushToTalk({
    open() {
      const take = { frames: [], stops: 0, cancelled: false };
      take.result = new Promise((resolve, reject) => {
        take.resolve = resolve;
        take.reject = reject;
      });
      void take.result.catch(() => {});
      takes.push(take);
      return {
        result: take.result,
        write: (pcm) => take.frames.push(pcm),
        finish: () => {
          take.finishes = (take.finishes || 0) + 1;
          return take.result;
        },
        cancel: () => {
          take.cancelled = true;
        },
      };
    },
    record(frame) {
      const take = takes.at(-1);
      take.frame = frame;
      return {
        stop: async () => {
          take.stops++;
        },
        cancel: () => {
          take.closed = true;
        },
      };
    },
    interrupt: () => interrupts++,
    status: (state) => states.push(state),
    submit: (text) => submitted.push(text),
    problem: (text) => problems.push(text),
  });
  t.after(() => capture.dispose());
  return {
    capture,
    takes,
    submitted,
    problems,
    states,
    get interrupts() {
      return interrupts;
    },
  };
}
function press(t, f, voiced = true) {
  f.capture.press();
  t.mock.timers.tick(120);
  const take = f.takes.at(-1);
  for (let i = 0; i < 3; i++) take.frame(new Int16Array(320).fill(voiced ? 10000 : 0).buffer);
  return take;
}
test('未按键不打开识别，先打断扬声器，一次按住只在松开后提交一次云端文字', async (t) => {
  const f = fixture(t);
  t.mock.timers.tick(10000);
  assert.equal(f.takes.length, 0);
  f.capture.press();
  assert.equal(f.interrupts, 1);
  assert.equal(f.takes.length, 0);
  t.mock.timers.tick(120);
  const take = f.takes[0];
  for (let i = 0; i < 3; i++) take.frame(new Int16Array(320).fill(10000).buffer);
  f.capture.press();
  assert.equal(f.interrupts, 1);
  assert.deepEqual(f.submitted, []);
  f.capture.release();
  await tick();
  assert.equal(take.stops, 1);
  assert.equal(f.states.at(-1), 'transcribing');
  take.resolve('去走廊');
  await tick();
  assert.deepEqual(f.submitted, ['去走廊']);
  assert.equal(take.closed, true);
  assert.equal(take.cancelled, true);
  f.capture.release();
  await tick();
  assert.deepEqual(f.submitted, ['去走廊']);
});
test('按住期间连接失败立即停止采集并保留原始原因，松开后可重试', async (t) => {
  const f = fixture(t);
  const take = press(t, f);
  take.reject(new Error('灵矽连接失败，请检查游戏服务。'));
  await tick();
  assert.equal(f.capture.holding, false);
  assert.equal(take.closed, true);
  assert.equal(take.cancelled, true);
  assert.deepEqual(f.problems, ['灵矽连接失败，请检查游戏服务。']);
  f.capture.release();
  await tick();
  assert.equal(f.problems.length, 1);
  const next = press(t, f);
  f.capture.release();
  await tick();
  next.resolve('看看地图');
  await tick();
  assert.deepEqual(f.submitted, ['看看地图']);
});
test('轻点和纯静音不生成回合，也不提交云端可能的幻觉文字', async (t) => {
  const f = fixture(t);
  f.capture.press();
  f.capture.release();
  await tick();
  t.mock.timers.tick(1000);
  assert.equal(f.takes.length, 0);
  const take = press(t, f, false);
  take.resolve('凭空出现的文字');
  f.capture.release();
  await tick();
  assert.equal(take.finishes, undefined);
  assert.deepEqual(f.submitted, []);
});
test('新按键和失焦取消后，迟到的云端转写不能发出命令', async (t) => {
  const f = fixture(t),
    old = press(t, f);
  f.capture.release();
  await tick();
  const next = press(t, f);
  old.resolve('旧命令');
  await tick();
  assert.deepEqual(f.submitted, []);
  f.capture.release();
  await tick();
  f.capture.cancel();
  next.resolve('失焦录音');
  await tick();
  assert.deepEqual(f.submitted, []);
  assert.equal(f.capture.holding, false);
});
test('识别错误、空文字和长按超时有反馈，失败后不会自动开启麦克风', async (t) => {
  const f = fixture(t);
  let take = press(t, f);
  f.capture.release();
  await tick();
  take.reject(new Error('灵矽连接中断'));
  await tick();
  assert.match(f.problems.at(-1), /连接中断/);
  take = press(t, f);
  f.capture.release();
  await tick();
  take.resolve('');
  await tick();
  assert.match(f.problems.at(-1), /没有识别清楚/);
  press(t, f);
  t.mock.timers.tick(30000);
  assert.match(f.problems.at(-1), /三十秒/);
  assert.equal(f.capture.holding, false);
  assert.deepEqual(f.submitted, []);
});
