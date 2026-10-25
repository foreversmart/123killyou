import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

async function fixture() {
  const runtime = hookRuntime();
  const hook = await loadHook(
    '../../src/app/game/useStoryPlayback.ts',
    'useStoryPlayback',
    runtime,
  );
  const submitted = [];
  const state = {
    id: 'session',
    runId: 'run',
    revision: 1,
    dialogueNext: '继续抵达对白',
    flags: {},
  };
  const voice = {
    status: 'idle',
    playbackOn: true,
    microphoneOn: false,
    problem: '麦克风未获授权，请检查浏览器权限。',
    microphoneProblem: '麦克风未获授权，请检查浏览器权限。',
    playbackProblem: '',
    submit: (text) => submitted.push(text),
  };
  return {
    runtime,
    state,
    voice,
    submitted,
    render: (nextState = state, nextVoice = voice, ready = true) =>
      runtime.render(hook, nextState, nextVoice, ready),
  };
}

test('播放待机时自动接续安全对白；同一分镜只提交一次', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushTimers();
  assert.deepEqual(f.submitted, ['继续抵达对白']);
  f.render({ ...f.state });
  f.runtime.flushTimers();
  assert.equal(f.submitted.length, 1);
  f.render({ ...f.state, revision: 2, dialogueNext: '下一句守夜人对白' });
  f.runtime.flushTimers();
  assert.deepEqual(f.submitted, ['继续抵达对白', '下一句守夜人对白']);
  f.runtime.dispose();
});

test('未开启播放时，安全的 NPC 串联仍会等待后自动提交', async () => {
  const f = await fixture();
  f.render(f.state, { ...f.voice, playbackOn: false });
  f.runtime.flushTimers();
  assert.deepEqual(f.submitted, ['继续抵达对白']);
  f.runtime.dispose();
});

test('说话、录音、暂停、道具阅读、死亡或播放错误期间不自动触发下一动作', async () => {
  for (const override of [
    { voice: { status: 'speaking' } },
    { voice: { status: 'recording' } },
    { voice: { status: 'processing' } },
    { voice: { playbackProblem: '播放失败' } },
    { state: { paused: true } },
    { state: { overlay: 'history' } },
    { state: { flags: { story_dead: true } } },
    { state: { dialogueNext: '' } },
    { ready: false },
  ]) {
    const f = await fixture();
    f.render(
      { ...f.state, ...override.state },
      { ...f.voice, ...override.voice },
      override.ready ?? true,
    );
    f.runtime.flushTimers();
    assert.deepEqual(f.submitted, [], JSON.stringify(override));
    f.runtime.dispose();
  }
});

test('等待接续时打开道具或开始说话，会取消尚未触发的调度', async () => {
  const f = await fixture();
  f.render();
  assert.equal(f.runtime.pendingTimers, 1);
  f.render({ ...f.state, overlay: 'scripture' });
  f.runtime.flushTimers();
  assert.deepEqual(f.submitted, []);
  f.render(f.state, { ...f.voice, status: 'listening', microphoneOn: true });
  assert.equal(f.runtime.pendingTimers, 1);
  f.render(f.state, { ...f.voice, status: 'recording', microphoneOn: true });
  f.runtime.flushTimers();
  assert.deepEqual(f.submitted, []);
  f.runtime.dispose();
});
