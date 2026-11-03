import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const MUSIC = '/audio/opening_bus_horror.mp3';
const ROAD_VOLUME = 0.22;
const ARRIVAL_VOLUME = 0.045;
const FADE_MS = 2500;

test('开场大巴音乐在山路循环，并在停门阶段渐弱后停止', async () => {
  const runtime = hookRuntime();
  const players = [];
  class FakeAudio {
    paused = true;
    currentTime = 0;
    loop = false;
    preload = '';
    volume = 1;

    constructor(source) {
      this.source = source;
      players.push(this);
    }

    play() {
      this.paused = false;
      this.playCount = (this.playCount || 0) + 1;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
      this.pauseCount = (this.pauseCount || 0) + 1;
    }
  }
  const useOpeningMusic = await loadHook(
    '../../src/features/story_audio/opening_music.ts',
    'useOpeningMusic',
    runtime,
    {
      Audio: FakeAudio,
      OPENING_BACKGROUND_MUSIC: MUSIC,
      OPENING_BACKGROUND_MUSIC_VOLUME: ROAD_VOLUME,
      OPENING_BACKGROUND_MUSIC_ARRIVAL_VOLUME: ARRIVAL_VOLUME,
      OPENING_BACKGROUND_MUSIC_FADE_MS: FADE_MS,
      setTimeout: runtime.bindings.setTimeout,
      clearTimeout: runtime.bindings.clearTimeout,
    },
  );

  runtime.render(useOpeningMusic, 'road', false, true);
  await Promise.resolve();
  assert.equal(players.length, 1);
  assert.equal(players[0].source, MUSIC);
  assert.equal(players[0].loop, true);
  assert.equal(players[0].volume, ROAD_VOLUME);
  assert.equal(players[0].playCount, 1);

  runtime.render(useOpeningMusic, 'alighting', false, true);
  assert.ok(runtime.pendingTimers > 0);
  for (let i = 0; i < Math.ceil(FADE_MS / 50) + 1; i++) runtime.flushTimers();
  assert.ok(Math.abs(players[0].volume - ARRIVAL_VOLUME) < 0.001);

  runtime.render(useOpeningMusic, 'alighting', true, true);
  assert.equal(players[0].paused, true);
  runtime.render(useOpeningMusic, 'done', false, true);
  assert.equal(players[0].paused, true);
  assert.equal(players[0].currentTime, 0);
  assert.equal(players[0].volume, ROAD_VOLUME);
  runtime.dispose();
});
