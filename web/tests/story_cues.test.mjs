import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { storyCues, cueSignature } from '../src/features/story_audio/cues.ts';
import { audioFixture, hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const state = (shotKey, extra = {}) => ({
  runId: 'run-1',
  sceneKey: 'mini_night',
  shotKey,
  revision: 1,
  flags: {},
  ...extra,
});

test('更锣与敲门按分镜给出清楚的独立计数，钟声不计作更锣', () => {
  for (const [shot, kind, count] of [
    ['corridor_two_gongs', 'gong', 2],
    ['wake_candle', 'gong', 3],
    ['four_knocks', 'knock', 4],
    ['three_knocks', 'knock', 3],
    ['dawn_knocks', 'knock', 3],
  ]) {
    const cues = storyCues(state(shot));
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
    ['gong', 'gong', 'gong', 'gong', 'gong', 'bell'],
  );
  assert.ok(falseDawn[5].at > falseDawn[4].at);
  const trueDawn = storyCues(state('dawn_courtyard'));
  assert.deepEqual(
    trueDawn.map((cue) => cue.kind),
    ['gong', 'gong', 'gong', 'gong', 'gong', 'bird', 'bird'],
  );
  assert.ok(trueDawn[5].at > trueDawn[4].at);
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
      storyCues,
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
