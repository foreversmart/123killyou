import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { storyCues, cueSignature, cueDuration } from '../src/features/story_audio/cues.ts';
import {
  NIGHT_BACKGROUND_MUSIC,
  NIGHT_BACKGROUND_MUSIC_DELAY_MS,
  shouldPlayNightBackground,
} from '../src/features/story_audio/music.ts';
import { oracleFaces } from '../src/scene/story_observation/oracle_faces.ts';
import { audioFixture, hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const state = (shotKey, extra = {}) => ({
  runId: 'run-1',
  sceneKey: 'mini_night',
  shotKey,
  revision: 1,
  flags: {},
  ...extra,
});

test('报时统一使用更锣，敲门仍保持独立计数', () => {
  for (const [shot, kind, count] of [
    ['corridor_two_gongs', 'gong', 2],
    ['wake_candle', 'gong', 3],
    ['four_knocks', 'knock', 4],
    ['three_knocks', 'knock', 3],
    ['dawn_knocks', 'knock', 3],
  ]) {
    const cues = storyCues(state(shot)).filter((cue) => cue.kind === kind);
    assert.equal(cues.length, count, shot);
    assert.ok(
      cues.every((cue) => cue.kind === kind),
      shot,
    );
    assert.equal(cues[0].at, 0, shot);
    assert.ok(
      cues.slice(1).every((cue, i) => cue.at > cues[i].at),
      shot,
    );
  }
  const falseDawn = storyCues(state('dawn_gongs'));
  assert.deepEqual(
    falseDawn.map((cue) => cue.kind),
    ['gong', 'gong', 'gong', 'gong', 'gong', 'gong'],
  );
  assert.ok(falseDawn[5].at > falseDawn[4].at);
  assert.ok(cueDuration(falseDawn[5]) > cueDuration(falseDawn[0]));
  const trueDawn = storyCues(state('dawn_courtyard'));
  assert.deepEqual(
    trueDawn.map((cue) => cue.kind),
    ['gong', 'gong', 'gong', 'gong', 'gong', 'rooster', 'bird', 'bird'],
  );
  assert.ok(trueDawn[5].at > trueDawn[4].at);
});

test('三更醒来后才进入夜间背景音乐，并在天亮时停止', async () => {
  const runtime = hookRuntime(),
    audio = audioFixture(),
    listeners = new Map(),
    players = [];
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
  audio.AudioContext.prototype.createGain = () => ({ gain: {}, connect() {}, disconnect() {} });
  const useStorySound = await loadHook(
    '../../src/features/story_audio/useStorySound.ts',
    'useStorySound',
    runtime,
    {
      Audio: FakeAudio,
      AudioContext: audio.AudioContext,
      cueSignature,
      cueDuration,
      storyCues,
      NIGHT_BACKGROUND_MUSIC,
      NIGHT_BACKGROUND_MUSIC_DELAY_MS,
      shouldPlayNightBackground,
      document: {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name) => listeners.delete(name),
      },
      playStoryCue: () => [{ stop() {} }],
    },
  );
  const waking = state('wake_candle', { sceneKey: 'mini_wake_three_gongs' });
  runtime.render(useStorySound, waking, true, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, waking, true, 'idle');
  assert.equal(players.length, 1);
  assert.equal(players[0].playCount || 0, 0);
  runtime.flushTimers();
  await Promise.resolve();
  assert.equal(players[0].playCount, 1);

  runtime.render(useStorySound, state('dawn_gongs', { sceneKey: 'mini_dawn_trap' }), true, 'idle');
  assert.equal(players[0].paused, false);
  runtime.render(useStorySound, state('dawn_courtyard', { sceneKey: 'mini_dawn' }), true, 'idle');
  assert.equal(players[0].paused, true);
  assert.equal(players[0].currentTime, 0);
  runtime.dispose();
});

test('重听只改变声源播放签名，不变更道具、死亡或开门选择', () => {
  const original = state('four_knocks', { lastHeard: '观察门缝', flags: { candle_lit: true } });
  const before = structuredClone(original);
  const first = storyCues(original);
  const replay = { ...original, lastHeard: '重听当前声响', revision: 2 };
  assert.deepEqual(storyCues(replay), first);
  assert.notEqual(cueSignature(replay), cueSignature(original));
  assert.notEqual(cueSignature({ ...replay, revision: 3 }), cueSignature(replay));
  assert.equal(cueSignature({ ...original, revision: 20 }), cueSignature(original));
  assert.deepEqual(original, before);
  assert.deepEqual(storyCues(state('unknown_shot')), []);
});

test('同一声源自动只播一次；主动重听后普通调查不再额外播放', async () => {
  const runtime = hookRuntime(),
    audio = audioFixture(),
    listeners = new Map(),
    heard = [];
  audio.AudioContext.prototype.createGain = () => ({ gain: {}, connect() {}, disconnect() {} });
  const useStorySound = await loadHook(
    '../../src/features/story_audio/useStorySound.ts',
    'useStorySound',
    runtime,
    {
      AudioContext: audio.AudioContext,
      cueSignature,
      cueDuration,
      storyCues,
      NIGHT_BACKGROUND_MUSIC,
      NIGHT_BACKGROUND_MUSIC_DELAY_MS,
      shouldPlayNightBackground,
      document: {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name) => listeners.delete(name),
      },
      playStoryCue: (_context, cue) => {
        heard.push(cue.kind);
        return [{ stop() {} }];
      },
    },
  );
  const original = state('four_knocks', { lastHeard: '等候敲门' });
  runtime.render(useStorySound, original, true, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, original, true, 'idle');
  assert.deepEqual(heard, ['knock', 'knock', 'knock', 'knock']);
  runtime.flushTimers();
  runtime.render(useStorySound, { ...original, revision: 2, lastHeard: '观察门缝' }, true, 'idle');
  assert.equal(heard.length, 4);
  const replay = { ...original, revision: 3, lastHeard: '重听敲门' };
  runtime.render(useStorySound, replay, true, 'idle');
  assert.equal(heard.length, 8);
  runtime.flushTimers();
  runtime.render(useStorySound, { ...original, revision: 4, lastHeard: '观察门缝' }, true, 'idle');
  assert.equal(heard.length, 8);
  runtime.render(useStorySound, { ...original, runId: 'new-run' }, true, 'idle');
  assert.equal(heard.length, 12);
  runtime.dispose();
});

test('客观调查直接播放所在位置的环境声，动物声可主动复听', () => {
  for (const [shot, kind] of [
    ['arrival_cat', 'cat'],
    ['listen_cat', 'cat'],
    ['oracle_cat', 'cat'],
    ['listen_bird', 'bird'],
    ['oracle_bird', 'bird'],
    ['room_candle', 'match'],
    ['room_latch', 'latch'],
    ['room_history', 'rustle'],
    ['register_camera_bell', 'chime'],
    ['listen_skin', 'tear'],
    ['ending_bus', 'bus'],
  ]) {
    const cues = storyCues(state(shot));
    assert.ok(
      cues.some((cue) => cue.kind === kind),
      shot,
    );
    assert.ok(
      cues.every((cue) => cueDuration(cue) > 0),
      shot,
    );
  }
  const waking = storyCues(state('wake_candle'));
  assert.deepEqual(
    waking.slice(3).map((cue) => cue.kind),
    ['breath', 'scrape'],
  );
  assert.ok(waking[3].at > waking[2].at + cueDuration(waking[2]));
  assert.ok(waking.slice(3).every((cue) => cue.pan > 0));
  const original = state('listen_cat', { lastHeard: '检查猫食碟' });
  assert.notEqual(cueSignature(original), cueSignature({ ...original, revision: 2 }));
});

test('杯筊画面忠实显示服务端的一平一凸、两平和两凸，落地声分别对应两片', () => {
  assert.deepEqual(oracleFaces({ cup_roll_sacred: true }), ['flat', 'curved']);
  assert.deepEqual(oracleFaces({ cup_roll_laugh: true }), ['flat', 'flat']);
  assert.deepEqual(oracleFaces({ cup_roll_dark: true }), ['curved', 'curved']);
  assert.deepEqual(oracleFaces({ cup_jiao_rescue: true }), ['flat', 'curved']);
  assert.equal(oracleFaces({}), null);
  const cups = storyCues(state('oracle_cast'));
  assert.deepEqual(
    cups.map((cue) => cue.kind),
    ['wood', 'wood'],
  );
  assert.ok(cups[1].at > cups[0].at);
  assert.deepEqual(storyCues(state('wake_candle_detail')), []);
  const knocks = state('four_knocks', { lastHeard: '听敲门' });
  assert.notEqual(cueSignature(knocks), cueSignature({ ...knocks, revision: 2 }));
});

test('离开声源镜头会立即停止旧环境声，即使下一镜头暂在说话', async () => {
  const runtime = hookRuntime(),
    audio = audioFixture(),
    listeners = new Map();
  let stops = 0;
  audio.AudioContext.prototype.createGain = () => ({ gain: {}, connect() {}, disconnect() {} });
  const useStorySound = await loadHook(
    '../../src/features/story_audio/useStorySound.ts',
    'useStorySound',
    runtime,
    {
      AudioContext: audio.AudioContext,
      cueSignature,
      cueDuration,
      storyCues,
      NIGHT_BACKGROUND_MUSIC,
      NIGHT_BACKGROUND_MUSIC_DELAY_MS,
      shouldPlayNightBackground,
      document: {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name) => listeners.delete(name),
      },
      playStoryCue: () => [
        {
          stop() {
            stops++;
          },
        },
      ],
    },
  );
  runtime.render(useStorySound, state('listen_skin'), true, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, state('listen_skin'), true, 'idle');
  runtime.render(useStorySound, state('room_table'), true, 'speaking');
  assert.equal(stops, 2);
  runtime.dispose();
});

test('七名角色与旁白各有明确且不同的云端声线，内心独白保留主角身份', async () => {
  const ids = ['player', 'linlan', 'zhouyan', 'xuzhi', 'keeper', 'huipu', 'shangong'];
  const profiles = await Promise.all(
    ids.map(async (id) =>
      JSON.parse(
        await readFile(
          new URL(`../../internal/content/npcs/${id}/profile.json`, import.meta.url),
          'utf8',
        ),
      ),
    ),
  );
  profiles.push(
    JSON.parse(
      await readFile(
        new URL('../../internal/content/narrator/profile.json', import.meta.url),
        'utf8',
      ),
    ),
  );
  assert.equal(profiles[0].name, '你·心声');
  assert.ok(profiles[0].aliases.includes('内心独白'));
  assert.deepEqual(
    profiles.slice(0, 7).map((profile) => profile.id),
    ids,
  );
  const voiceIds = profiles.map((profile) => profile.voice.providerVoiceId);
  assert.ok(voiceIds.every((id) => /^[a-f0-9]{32}$/.test(id)));
  assert.equal(new Set(voiceIds).size, 8);
});
