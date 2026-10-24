import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recognitionStream } from '../src/features/session/recognitionStream.ts';

const NativeWebSocket = globalThis.WebSocket;
function fixture(t) {
  const sockets = [];
  globalThis.WebSocket = class {
    bufferedAmount = 0;
    sent = [];
    constructor() {
      sockets.push(this);
    }
    send(value) {
      this.sent.push(value);
    }
    close() {
      this.closed = true;
    }
    event(value) {
      this.onmessage?.({ data: JSON.stringify(value) });
    }
  };
  t.after(() => {
    globalThis.WebSocket = NativeWebSocket;
  });
  const take = recognitionStream('ws://test/recognition', 'run');
  t.after(() => take.cancel());
  return { take, socket: sockets[0] };
}
test('上传 PCM 而非文字，连接就绪后保持帧顺序，松开后只发送一次 stop', async (t) => {
  const { take, socket } = fixture(t);
  const frame = new ArrayBuffer(640);
  take.write(frame);
  socket.onopen();
  assert.deepEqual(JSON.parse(socket.sent[0]), { type: 'start', runId: 'run' });
  const result = take.finish();
  take.finish();
  socket.event({ type: 'ready' });
  assert.equal(socket.sent[1], frame);
  assert.deepEqual(JSON.parse(socket.sent[2]), { type: 'stop' });
  assert.equal(socket.sent.length, 3);
  socket.event({ type: 'transcript', text: '看看地图' });
  assert.equal(await result, '看看地图');
  assert.equal(socket.closed, true);
});
test('取消关闭云端连接，迟到的识别结果不会恢复录音', async (t) => {
  const { take, socket } = fixture(t);
  socket.onopen();
  socket.event({ type: 'ready' });
  const late = socket.onmessage;
  const result = take.finish();
  take.cancel();
  late({ data: JSON.stringify({ type: 'transcript', text: '去走廊' }) });
  await assert.rejects(result, /取消/);
  assert.equal(socket.closed, true);
});
test('连接失败和识别超时明确失败，不使用浏览器识别降级', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let f = fixture(t);
  f.socket.onerror();
  await assert.rejects(f.take.finish(), /无法连接/);
  f = fixture(t);
  f.socket.onopen();
  f.socket.event({ type: 'ready' });
  const result = f.take.finish();
  t.mock.timers.tick(12000);
  await assert.rejects(result, /没有识别出/);
});
test('连接失败后继续到达的音频帧不会覆盖首次错误', async (t) => {
  const { take, socket } = fixture(t);
  socket.event({ type: 'error', error: '灵矽语音识别未完成，请重试。' });
  assert.throws(() => take.write(new ArrayBuffer(640)), /灵矽语音识别未完成/);
  await assert.rejects(take.result, /灵矽语音识别未完成/);
  await assert.rejects(take.finish(), /灵矽语音识别未完成/);
});
