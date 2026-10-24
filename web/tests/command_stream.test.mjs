import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandStream } from '../src/features/session/commandStream.ts';

const command = { runId: 'run', requestId: 'request', text: '你是谁' };
const speech = (event) => ({ type: 'speech', requestId: 'request', speech: event });
const result = { type: 'state', requestId: 'request', state: { id: 'game', revision: 1 } };
const encode = (event) => new TextEncoder().encode(JSON.stringify(event) + '\n');
function mockStream(t, chunks) {
  let controller;
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        new ReadableStream({
          start(value) {
            controller = value;
            chunks?.forEach((chunk) => value.enqueue(chunk));
          },
        }),
      ),
  );
  return () => controller;
}

test('跨字节 UTF8 / NDJSON 分块仍即时交付字幕和音频，最终状态单独确认', async (t) => {
  const receive = mockStream(t);
  const events = [],
    states = [];
  const pending = commandStream(
    '/stream',
    command,
    { onSpeech: (event) => events.push(event) },
    (state) => states.push(state),
  );
  await new Promise((resolve) => setImmediate(resolve));
  const text = encode(speech({ kind: 'text', text: '守夜人。' }));
  for (const byte of text) receive().enqueue(Uint8Array.of(byte));
  receive().enqueue(encode(speech({ kind: 'audio', pcm: 'AAA=' })));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [
    { kind: 'text', text: '守夜人。' },
    { kind: 'audio', pcm: 'AAA=' },
  ]);
  assert.equal(states.length, 0);
  receive().enqueue(encode(result));
  assert.deepEqual(await pending, { result, streamed: true });
  assert.deepEqual(states, [result]);
});

test('无最终确认的断流、云端错误及错误的请求 ID 均不视为完成', async (t) => {
  for (const messages of [
    [speech({ kind: 'start', sampleRate: 16000 })],
    [{ ...result, type: 'error', error: '灵矽暂时不可用' }],
    [{ ...result, requestId: 'old-request' }],
  ]) {
    const receive = mockStream(t, messages.map(encode));
    const pending = commandStream('/stream', command, {}, () => {});
    receive().close();
    await assert.rejects(pending, /中断|不可用|不匹配/);
    t.mock.restoreAll();
  }
});

test('外部取消传到 fetch 并停止接收回合', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.signal.aborted, false);
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });
  });
  const pending = commandStream('/stream', command, { signal: controller.signal }, () =>
    assert.fail('cancelled state'),
  );
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('动作状态立即交付，语音继续流入，最终结果不重复执行动作', async (t) => {
  const receive = mockStream(t),
    states = [],
    actions = [],
    events = [];
  const pending = commandStream(
    '/stream',
    command,
    { onAction: (state) => actions.push(state), onSpeech: (event) => events.push(event) },
    (state) => states.push(state),
  );
  await new Promise((resolve) => setImmediate(resolve));
  receive().enqueue(encode({ ...result, type: 'action' }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(states, [result]);
  assert.deepEqual(actions, [result]);
  assert.deepEqual(events, []);
  receive().enqueue(encode(speech({ kind: 'audio', pcm: 'AAA=' })));
  receive().enqueue(encode(result));
  const final = await pending;
  assert.equal(final.streamed, true);
  assert.equal(actions.length, 1);
  assert.equal(states.length, 2);
});
