import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PCMFrames } from '../src/features/voice/capture_processor.js';

test('16k/44.1k/48k 输入重采样为 20ms 单声道 PCM16LE，跨块不漂移', () => {
  for (const rate of [16000, 44100, 48000]) {
    const frames = [],
      encoder = new PCMFrames(rate, (pcm) => frames.push(pcm));
    const samples = new Float32Array(rate).fill(0.5);
    for (let i = 0; i < samples.length; i += 128) encoder.push(samples.slice(i, i + 128));
    encoder.flush();
    assert.equal(frames.length, 50);
    for (const frame of frames) {
      assert.equal(frame.byteLength, 640);
      const values = new DataView(frame);
      for (let i = 0; i < 640; i += 2) assert.ok(Math.abs(values.getInt16(i, true) - 16384) <= 1);
    }
  }
});
test('尾帧补零，采样限幅并使用有符号小端格式', () => {
  const frames = [],
    encoder = new PCMFrames(16000, (pcm) => frames.push(pcm));
  encoder.push(Float32Array.of(-2, 2, -0.5));
  encoder.flush();
  encoder.flush();
  assert.equal(frames.length, 1);
  const view = new DataView(frames[0]);
  assert.equal(view.getInt16(0, true), -32768);
  assert.equal(view.getInt16(2, true), 32767);
  assert.equal(view.getInt16(4, true), -16384);
  assert.equal(view.getInt16(6, true), 0);
});
