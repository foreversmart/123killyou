import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bellBuffer, bellSamples } from '../src/features/story_audio/bell.ts';
import { percussionBuffer } from '../src/features/story_audio/percussion.ts';
import { cueDuration, cueSignature, storyCues } from '../src/features/story_audio/cues.ts';
import {
  DEATH_SOUND_EFFECT,
  NIGHT_BACKGROUND_MUSIC,
  NIGHT_BACKGROUND_MUSIC_DELAY_MS,
  shouldPlayNightBackground,
} from '../src/features/story_audio/music.ts';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const rate = 24000;
const rms = (data) =>
  Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
const peak = (data) => data.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
const state = (shotKey, sceneKey = 'mini_dawn_trap') => ({
  runId: 'bell-run',
  sceneKey,
  shotKey,
  revision: 1,
  flags: {},
});

test('远钟经总音量和左右声道混音后仍有清晰起音、可听泛音和长余响', () => {
  const cue = storyCues(state('dawn_gongs')).at(-1);
  const samples = bellSamples(rate, cueDuration(cue), cue.distant);
  assert.ok(samples.every(Number.isFinite));
  assert.ok(peak(samples) > 0.9 && peak(samples) < 1, '钟声保留清晰峰值和混音余量');
  assert.ok(Math.abs(samples.at(-1)) < 0.0001, '钟尾平滑结束');
  const angle = ((cue.pan + 1) * Math.PI) / 4;
  for (const channel of [Math.cos(angle), Math.sin(angle)]) {
    const gain = channel * 0.5;
    assert.ok(peak(samples) * gain > 0.25, '两侧扬声器均能听清敲钟起音');
    const attack = rms(samples.subarray(0, rate * 0.15)) * gain;
    const tail = rms(samples.subarray(rate, rate * 1.2)) * gain;
    assert.ok(attack > 0.055, '起音不能退回弱低频嗡声');
    assert.ok(tail > 0.02 && tail < attack, '一秒后仍有可辨、自然衰减的钟声');
  }
  // A high-pass proxy catches regressions that retain only bass inaudible on small speakers.
  let low = 0;
  const alpha = 1 - Math.exp((-2 * Math.PI * 300) / rate);
  const audible = samples.slice(0, rate * 0.5).map((sample) => {
    low += alpha * (sample - low);
    return sample - low;
  });
  assert.ok(rms(audible) > 0.07, '300 Hz 以上保留足够的钟锤与金属共振能量');
});

function soundRuntime() {
  const runtime = hookRuntime();
  const timers = new Map(),
    sources = [],
    gains = [],
    players = [],
    listeners = new Map();
  let now = 0,
    timerId = 0;
  runtime.bindings.setTimeout = (callback, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  runtime.bindings.clearTimeout = (id) => timers.delete(id);
  const advance = (milliseconds) => {
    const target = now + milliseconds;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = target;
  };
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
  class AudioContext {
    sampleRate = rate;
    destination = {};
    get currentTime() {
      return now / 1000;
    }
    resume() {
      return Promise.resolve();
    }
    close() {
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
        stop() {
          this.stopped = true;
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    }
    createStereoPanner() {
      return { ...node(), pan: { value: 0 } };
    }
    createGain() {
      const gain = { ...node(), gain: { value: 1 } };
      gains.push(gain);
      return gain;
    }
  }
  class Audio {
    paused = true;
    currentTime = 0;
    volume = 1;
    constructor(source) {
      this.source = source;
      players.push(this);
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  const document = {
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event) => listeners.delete(event),
  };
  return { runtime, advance, sources, gains, players, listeners, AudioContext, Audio, document };
}

test('完整播放四锣一钟：钟尾结束前音轨保持连接，背景音乐压低后恢复', async () => {
  const fixture = soundRuntime();
  const { runtime, advance, sources, gains, players, listeners } = fixture;
  const playStoryCue = await loadHook(
    '../../src/features/story_audio/synthesis.ts',
    'playStoryCue',
    runtime,
    { cueDuration, percussionBuffer, bellBuffer },
  );
  const useSound = await loadHook(
    '../../src/features/story_audio/useStorySound.ts',
    'useStorySound',
    runtime,
    {
      ...fixture,
      cueDuration,
      cueSignature,
      storyCues,
      playStoryCue,
      DEATH_SOUND_EFFECT,
      NIGHT_BACKGROUND_MUSIC,
      NIGHT_BACKGROUND_MUSIC_DELAY_MS,
      shouldPlayNightBackground,
    },
  );
  const previous = state('four_knocks', 'mini_four_knocks');
  runtime.render(useSound, previous, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useSound, previous, 'idle');
  advance(7000);
  await Promise.resolve();
  runtime.render(useSound, previous, 'idle');
  const music = players.find((player) => player.source === NIGHT_BACKGROUND_MUSIC);
  assert.equal(music.paused, false);
  assert.equal(music.volume, 0.22);

  const dawn = state('dawn_gongs');
  runtime.render(useSound, dawn, 'idle');
  assert.equal(runtime.render(useSound, dawn, 'idle'), true);
  const phrase = sources.slice(4);
  const bus = gains.at(-1);
  assert.equal(phrase.length, 5);
  assert.deepEqual(
    phrase.map((source) => source.startedAt),
    [0, 0.85, 1.7, 2.55, 5.1].map((at) => 7 + at + 0.03),
  );
  assert.ok(phrase[4].buffer.duration >= 3.3);
  assert.equal(music.volume, 0.055);
  advance(5100);
  assert.equal(bus.disconnected, false, '四锣结束后必须继续保留钟声音轨');
  assert.ok(phrase.every((source) => !source.stopped));
  advance(3350);
  assert.equal(runtime.render(useSound, dawn, 'idle'), true);
  assert.equal(bus.disconnected, false, '钟尾尚未结束，不能按锣声时长切断');
  assert.equal(music.volume, 0.055);
  advance(20);
  assert.equal(runtime.render(useSound, dawn, 'idle'), false);
  assert.equal(bus.disconnected, true);
  assert.equal(music.volume, 0.22);
  assert.equal(music.paused, false);
  assert.equal(sources.length, 9, '播放结束不会重复触发声源');
  runtime.dispose();
});
