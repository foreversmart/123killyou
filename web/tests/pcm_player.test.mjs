import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPCMPlayer } from '../src/features/voice/pcmPlayer.ts';

function audioContext() {
  const sources = [];
  const context = {
    currentTime: 1,
    destination: {},
    createBuffer(_channels, length, rate) {
      const data = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => data, data };
    },
    createBufferSource() {
      const source = {
        buffer: null,
        onended: null,
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        start(at) {
          this.at = at;
        },
        stop() {
          this.stopped = true;
        },
        end() {
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    },
  };
  return { context, sources };
}
const samples = (count) => new Uint8Array(count * 2);

test('约 120ms 缓冲后即播放 PCM16LE，连续片段按音频时钟排列', () => {
  const { context, sources } = audioContext();
  const player = createPCMPlayer(context, 16000, () => {});
  const first = samples(1920);
  first.set([0, 128, 255, 127]);
  player.push(first.subarray(0, 1000));
  assert.equal(sources.length, 0);
  player.push(first.subarray(1000));
  assert.equal(sources.length, 1);
  assert.equal(sources[0].buffer.data[0], -1);
  assert.equal(sources[0].buffer.data[1], 32767 / 32768);
  assert.equal(sources[0].at, 1.025);
  player.push(samples(1920));
  assert.equal(sources[1].at, sources[0].at + 0.12);
  assert.equal(player.received, true);
  assert.equal(player.playing, true);
});

test('结束时冲刷短尾块，全部播完才通知；重复结束没有副作用', () => {
  const { context, sources } = audioContext();
  let ended = 0;
  const player = createPCMPlayer(context, 24000, () => ended++);
  player.push(samples(2880));
  player.push(samples(20));
  player.finish();
  player.finish();
  assert.equal(sources.length, 2);
  sources[0].end();
  assert.equal(ended, 0);
  sources[1].end();
  assert.equal(ended, 1);
  assert.equal(player.playing, false);
});

test('打断清空全部已排队音频与尾块，迟到数据不能恢复播放', () => {
  const { context, sources } = audioContext();
  let ended = 0;
  const player = createPCMPlayer(context, 16000, () => ended++);
  player.push(samples(1920));
  player.push(samples(10));
  player.stop();
  player.stop();
  player.push(samples(1920));
  player.finish();
  sources[0].end();
  assert.equal(sources.length, 1);
  assert.equal(sources[0].stopped, true);
  assert.equal(sources[0].disconnected, true);
  assert.equal(ended, 0);
  assert.equal(player.playing, false);
});

test('网络间断后从当前音频时钟恢复，拒绝格式错误与过量数据', () => {
  const { context, sources } = audioContext();
  const player = createPCMPlayer(context, 16000, () => {});
  player.push(samples(1920));
  sources[0].end();
  context.currentTime = 5;
  player.push(samples(1920));
  assert.equal(sources[1].at, 5.025);
  assert.throws(() => player.push(new Uint8Array(3)), /不完整/);
  assert.throws(() => player.push(samples(16000 * 71)), /超出/);
  assert.throws(() => createPCMPlayer(context, 48000, () => {}), /采样率/);
  player.stop();
});
