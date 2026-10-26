import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { storyCues, cueSignature, cueDuration } from '../src/features/story_audio/cues.ts';
import {
  DEATH_SOUND_EFFECT,
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
    ['gong', 'gong', 'gong', 'gong', 'bell'],
  );
  assert.ok(falseDawn[4].at > falseDawn[3].at + cueDuration(falseDawn[3]));
  assert.ok(cueDuration(falseDawn[4]) > cueDuration(falseDawn[0]));
  assert.deepEqual(storyCues(state('', { sceneKey: 'mini_dawn_trap' })), falseDawn);
  const trueDawn = storyCues(state('dawn_courtyard'));
  assert.deepEqual(
    trueDawn.map((cue) => cue.kind),
    ['gong', 'gong', 'gong', 'gong', 'gong', 'rooster', 'bird', 'bird'],
  );
  assert.ok(trueDawn[5].at > trueDawn[4].at);
});

test('二更锣在发烛镜头播放，未点烛等待镜头使用两次重撞门', () => {
  assert.deepEqual(
    storyCues(state('corridor_candles')).map((cue) => cue.kind),
    ['gong', 'gong'],
  );
  assert.deepEqual(
    storyCues(state('corridor_two_gongs', { flags: { corridor_gongs_played: true } })),
    [],
  );
  assert.deepEqual(
    storyCues(state('room_ghost_wait')).map((cue) => cue.kind),
    ['impact', 'impact'],
  );
  assert.deepEqual(
    storyCues(state('wake_ghost_wait')).map((cue) => cue.kind),
    ['impact', 'impact'],
  );
  const impacts = storyCues(state('room_ghost_wait'));
  assert.ok(impacts[1].at > impacts[0].at + cueDuration(impacts[0]) + 0.5);
});

test('未点烛死亡先开门，半秒后鬼影冲入', () => {
  const cues = storyCues(
    state('death_mini_room', { sceneKey: 'mini_death', retryScene: 'mini_room' }),
  );
  assert.deepEqual(
    cues.map((cue) => cue.kind),
    ['door', 'death'],
  );
  assert.equal(cues[0].at, 0);
  assert.equal(cues[1].at, 0.5);
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
  runtime.render(useStorySound, waking, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, waking, 'idle');
  assert.equal(players.length, 1);
  assert.equal(players[0].playCount || 0, 0);
  runtime.flushTimers();
  await Promise.resolve();
  assert.equal(players[0].playCount, 1);

  runtime.render(useStorySound, state('dawn_gongs', { sceneKey: 'mini_dawn_trap' }), 'idle');
  assert.equal(players[0].paused, false);
  runtime.render(useStorySound, state('dawn_courtyard', { sceneKey: 'mini_dawn' }), 'idle');
  assert.equal(players[0].paused, true);
  assert.equal(players[0].currentTime, 0);
  runtime.dispose();
});

test('死亡画面的恐怖音效与背景音乐并行播放，不暂停背景音乐', async () => {
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
      DEATH_SOUND_EFFECT,
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
  const night = state('four_knocks', { sceneKey: 'mini_four_knocks' });
  runtime.render(useStorySound, night, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, night, 'idle');
  runtime.flushTimers();
  await Promise.resolve();
  const background = players.find((player) => player.source === NIGHT_BACKGROUND_MUSIC);
  assert.ok(background);
  assert.equal(background.playCount, 1);
  const death = state('death_mini_four_knocks', {
    sceneKey: 'mini_death',
    retryScene: 'mini_four_knocks',
  });
  runtime.render(useStorySound, death, 'idle');
  await Promise.resolve();
  const effect = players.find((player) => player.source === DEATH_SOUND_EFFECT);
  assert.ok(effect);
  assert.equal(effect.playCount, 1);
  assert.equal(effect.volume, 0.85);
  assert.equal(background.paused, false);
  assert.equal(background.pauseCount || 0, 0);
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
  runtime.render(useStorySound, original, 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, original, 'idle');
  assert.deepEqual(heard, ['knock', 'knock', 'knock', 'knock']);
  runtime.flushTimers();
  runtime.render(useStorySound, { ...original, revision: 2, lastHeard: '观察门缝' }, 'idle');
  assert.equal(heard.length, 4);
  const replay = { ...original, revision: 3, lastHeard: '重听敲门' };
  runtime.render(useStorySound, replay, 'idle');
  assert.equal(heard.length, 8);
  runtime.flushTimers();
  runtime.render(useStorySound, { ...original, revision: 4, lastHeard: '观察门缝' }, 'idle');
  assert.equal(heard.length, 8);
  runtime.render(useStorySound, { ...original, runId: 'new-run' }, 'idle');
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

test('死亡结算先播放鬼扑杀音效，再保留来源环境声', () => {
  const fourKnocks = storyCues(
    state('death_mini_four_knocks', {
      sceneKey: 'mini_death',
      retryScene: 'mini_four_knocks',
    }),
  );
  assert.deepEqual(
    fourKnocks.map((cue) => cue.kind),
    ['death', 'door'],
  );
  assert.equal(fourKnocks[0].at, 0);
  assert.equal(fourKnocks[1].at, 0.62);
  assert.equal(cueDuration(fourKnocks[0]), 1.2);

  const oracle = storyCues(
    state('death_mini_oracle', {
      sceneKey: 'mini_death',
      retryScene: 'mini_oracle',
    }),
  );
  assert.deepEqual(
    oracle.map((cue) => cue.kind),
    ['death', 'step'],
  );
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
  runtime.render(useStorySound, state('listen_skin'), 'idle');
  listeners.get('pointerdown')();
  await Promise.resolve();
  runtime.render(useStorySound, state('listen_skin'), 'idle');
  runtime.render(useStorySound, state('room_table'), 'speaking');
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
  assert.equal(profiles[0].name, '赵熙·心声');
  assert.ok(profiles[0].aliases.includes('内心独白'));
  assert.deepEqual(
    profiles.slice(0, 7).map((profile) => profile.id),
    ids,
  );
  const voiceIds = profiles.map((profile) => profile.voice.providerVoiceId);
  assert.ok(voiceIds.every((id) => /^[a-f0-9]{32}$/.test(id)));
  assert.equal(new Set(voiceIds).size, 8);
});
