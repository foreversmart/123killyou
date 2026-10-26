import assert from 'node:assert/strict';
import { test } from 'node:test';
import { percussionBuffer, percussionSamples } from '../src/features/story_audio/percussion.ts';
import { bellBuffer } from '../src/features/story_audio/bell.ts';
import { cueDuration, cueSignature, storyCues } from '../src/features/story_audio/cues.ts';
import {
  DEATH_SOUND_EFFECT,
  NIGHT_BACKGROUND_MUSIC,
  NIGHT_BACKGROUND_MUSIC_DELAY_MS,
  shouldPlayNightBackground,
} from '../src/features/story_audio/music.ts';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const rate = 24000;
const peak = (data) => data.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
const rms = (data) =>
  Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
const state = (shotKey, extra = {}) => ({
  runId: 'sound-run',
  sceneKey: 'mini_corridor_candle',
  shotKey,
  revision: 1,
  flags: {},
  ...extra,
});

function audioGraph() {
  const sources = [],
    panners = [],
    gains = [],
    contexts = [];
  const node = () => ({
    disconnected: false,
    connect(target) {
      this.target = target;
      return target;
    },
    disconnect() {
      this.disconnected = true;
    },
  });
  const parameter = () => ({
    value: 1,
    changes: [],
    setValueAtTime(value, at) {
      this.changes.push({ value, at });
    },
    exponentialRampToValueAtTime(value, at) {
      this.changes.push({ value, at });
    },
  });
  class AudioContext {
    sampleRate = rate;
    currentTime = 3;
    destination = {};
    constructor() {
      contexts.push(this);
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      this.closed = true;
      return Promise.resolve();
    }
    createBuffer(_channels, length, sampleRate) {
      const samples = new Float32Array(length);
      return { duration: length / sampleRate, getChannelData: () => samples };
    }
    createBufferSource() {
      const source = {
        ...node(),
        start(at) {
          this.startedAt = at;
        },
        stop(at) {
          if (at !== undefined) {
            this.endsAt = at;
            return;
          }
          this.stopped = true;
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    }
    createOscillator() {
      const oscillator = this.createBufferSource();
      oscillator.frequency = parameter();
      return oscillator;
    }
    createStereoPanner() {
      const panner = { ...node(), pan: { value: 0 } };
      panners.push(panner);
      return panner;
    }
    createGain() {
      const gain = { ...node(), gain: parameter() };
      gains.push(gain);
      return gain;
    }
  }
  return { AudioContext, sources, panners, gains, contexts };
}

test('锣与敲门有清晰敲击强度，金属余响自然衰减且各自保留峰值余量', () => {
  const gong = percussionSamples('gong', rate, cueDuration({ kind: 'gong' }));
  const knock = percussionSamples('knock', rate, cueDuration({ kind: 'knock' }));
  const impact = percussionSamples('impact', rate, cueDuration({ kind: 'impact' }));
  for (const data of [gong, knock]) {
    assert.ok(peak(data) > 0.75 && peak(data) < 0.9);
    assert.ok(rms(data.subarray(0, rate / 10)) > 0.16, '敲击不应退回低音量');
    assert.ok(Math.abs(data.at(-1)) < 0.0001, '结尾不应突然切断');
    assert.ok(data.every(Number.isFinite));
  }
  const ring = rms(gong.subarray(rate, rate * 1.1));
  assert.ok(ring > 0.035, '一秒后仍应听见锣的金属余响');
  assert.ok(ring < rms(gong.subarray(rate * 0.1, rate * 0.2)), '余响应逐渐衰减');
  assert.ok(rms(knock.subarray(rate * 0.3, rate * 0.4)) < 0.003, '敲门应短促，不拖成锣声');
  assert.ok(peak(impact) >= peak(knock) * 2, '撞门峰值至少应是敲门的两倍');
  assert.ok(peak(impact) <= peak(knock) * 3, '撞门峰值不应超过敲门的三倍');
  assert.ok(rms(impact.subarray(0, rate / 10)) > rms(knock.subarray(0, rate / 10)) * 2);
});

test('锣的余响包含多个非整数倍共振峰，避免退回单音提示声', () => {
  const sampleRate = 12000;
  const ring = percussionSamples('gong', sampleRate, 2.3).subarray(
    sampleRate * 0.2,
    sampleRate * 0.7,
  );
  const spectrum = [];
  for (let frequency = 120; frequency <= 1200; frequency += 4) {
    let real = 0,
      imaginary = 0;
    for (let index = 0; index < ring.length; index++) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (ring.length - 1));
      const phase = (2 * Math.PI * frequency * index) / sampleRate;
      real += ring[index] * window * Math.cos(phase);
      imaginary += ring[index] * window * Math.sin(phase);
    }
    spectrum.push({ frequency, amplitude: Math.hypot(real, imaginary) / ring.length });
  }
  const peaks = spectrum.filter(
    (bin, index) =>
      index > 0 &&
      index < spectrum.length - 1 &&
      bin.amplitude > 0.006 &&
      bin.amplitude > spectrum[index - 1].amplitude &&
      bin.amplitude > spectrum[index + 1].amplitude,
  );
  assert.ok(peaks.length >= 5, '金属余响应保留多组明显共振');
  const fundamental = peaks[0].frequency;
  const uneven = peaks.filter(({ frequency }) => {
    const ratio = frequency / fundamental;
    return Math.abs(ratio - Math.round(ratio)) > 0.05;
  });
  assert.ok(uneven.length >= 3, '锣声的共振不应组成规则整数倍音阶');
});

test('近处四锣余响叠加仍有混音余量，停后才响起远处一声钟', () => {
  const cues = storyCues(state('dawn_gongs'));
  const duration = Math.max(...cues.map((cue) => cue.at + cueDuration(cue)));
  const mix = new Float32Array(Math.ceil(rate * duration));
  assert.ok(cues[4].at >= cues[3].at + cueDuration(cues[3]) + 0.15);
  const gongs = cues.filter((cue) => cue.kind === 'gong');
  assert.equal(gongs.length, 4);
  for (const cue of gongs) {
    const data = percussionSamples(cue.kind, rate, cueDuration(cue), cue.distant);
    const offset = Math.round(cue.at * rate);
    for (let index = 0; index < data.length; index++) mix[offset + index] += data[index] * 0.5;
  }
  assert.ok(peak(mix) < 0.65, '混响叠加应给背景声留下余量');
  assert.ok(mix.every(Number.isFinite), '不能截断锣声的缓冲区');
  assert.equal(cues[4].kind, 'bell');
  assert.equal(cues[4].distant, true);
  assert.ok(cues[4].pan > 0 && cues[4].pan <= 0.35);
  assert.ok(cueDuration(cues[4]) > cueDuration(cues[0]));
});

test('报时次数和敲门次数不混淆，锣尾结束后才有门外声与背景音乐', () => {
  for (const [shot, count] of [
    ['corridor_two_gongs', 2],
    ['wake_candle', 3],
    ['dawn_courtyard', 5],
  ]) {
    const gongs = storyCues(state(shot)).filter((cue) => cue.kind === 'gong');
    assert.equal(gongs.length, count);
    assert.deepEqual(
      gongs.map((cue) => cue.at),
      Array.from({ length: count }, (_, i) => i * 0.85),
    );
  }
  const knocks = storyCues(state('four_knocks'));
  assert.deepEqual(
    knocks.map((cue) => cue.kind),
    ['knock', 'knock', 'knock', 'knock'],
  );
  const waking = storyCues(state('wake_candle'));
  assert.ok(waking[3].at > waking[2].at + cueDuration(waking[2]) + 0.03);
  const soundEnd = Math.max(...waking.map((cue) => cue.at + cueDuration(cue))) + 0.06;
  assert.ok(NIGHT_BACKGROUND_MUSIC_DELAY_MS > soundEnd * 1000);
  for (const request of ['听锣', '辨认锣声', '重听五更和锣声']) {
    const replay = state('dawn_gongs', { lastHeard: request });
    assert.notEqual(cueSignature(replay), cueSignature({ ...replay, revision: 2 }));
  }
});

test('死亡画面叠加恐怖音效时继续保留夜间背景音乐', () => {
  assert.equal(DEATH_SOUND_EFFECT, '/audio/dead.mp3');
  assert.equal(
    shouldPlayNightBackground(state('death_mini_four_knocks', { sceneKey: 'mini_death' })),
    true,
  );
});

test('合成声按每击时间播放，复用波形不合并声源，结束后释放声源和空间节点', async () => {
  const graph = audioGraph();
  const context = new graph.AudioContext();
  const play = await loadHook(
    '../../src/features/story_audio/synthesis.ts',
    'playStoryCue',
    hookRuntime(),
    {
      cueDuration,
      percussionBuffer,
      bellBuffer,
    },
  );
  const cues = storyCues(state('dawn_gongs'));
  const sources = cues.flatMap((cue) => play(context, cue, context.destination));
  assert.equal(sources.length, 5);
  sources.forEach((source, index) =>
    assert.equal(source.startedAt, 3 + cues[Math.min(index, 4)].at + 0.03),
  );
  assert.equal(sources[0].buffer, sources[3].buffer);
  assert.ok(sources[4].buffer);
  assert.notEqual(sources[4].buffer, sources[0].buffer);
  assert.equal(sources[4].buffer.duration, 3.3);
  sources.forEach((source) => source.onended());
  assert.ok(sources.every((source) => source.disconnected));
  assert.ok(graph.panners.every((panner) => panner.disconnected));
});

test('暂停、转镜头和卸载立即停止长锣，播放计时留足尾音与调度时间', async () => {
  const graph = audioGraph(),
    runtime = hookRuntime(),
    listeners = new Map();
  const playStoryCue = await loadHook(
    '../../src/features/story_audio/synthesis.ts',
    'playStoryCue',
    runtime,
    {
      cueDuration,
      percussionBuffer,
      bellBuffer,
    },
  );
  const useSound = await loadHook(
    '../../src/features/story_audio/useStorySound.ts',
    'useStorySound',
    runtime,
    {
      ...graph,
      cueDuration,
      cueSignature,
      storyCues,
      NIGHT_BACKGROUND_MUSIC,
      NIGHT_BACKGROUND_MUSIC_DELAY_MS,
      shouldPlayNightBackground,
      playStoryCue,
      document: {
        addEventListener: (name, listener) => listeners.set(name, listener),
        removeEventListener: (name) => listeners.delete(name),
      },
    },
  );
  const original = state('corridor_two_gongs');
  runtime.render(useSound, original, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useSound, original, 'idle');
  assert.equal(graph.gains[0].gain.value, 0.5);
  assert.ok(runtime.pendingDelays.includes((0.85 + 2.3 + 0.06) * 1000));
  runtime.render(useSound, { ...original, paused: true }, 'idle');
  assert.ok(graph.sources.every((source) => source.stopped && source.disconnected));
  assert.ok(graph.panners.every((panner) => panner.disconnected));
  runtime.render(useSound, { ...original, lastHeard: '听锣', revision: 2 }, 'idle');
  assert.equal(graph.sources.length, 4);
  runtime.render(useSound, state('room_table'), 'speaking');
  assert.ok(graph.sources.every((source) => source.stopped));
  runtime.render(useSound, { ...original, runId: 'next-run' }, 'idle');
  runtime.dispose();
  assert.ok(graph.sources.every((source) => source.stopped && source.disconnected));
  assert.ok(graph.panners.every((panner) => panner.disconnected));
  assert.ok(graph.contexts.every((context) => context.closed));
});
