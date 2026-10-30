import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

async function fixture(options = {}) {
  const runtime = hookRuntime();
  const useOpeningFlow = await loadHook(
    '../../src/app/game/useOpeningFlow.ts',
    'useOpeningFlow',
    runtime,
  );
  const sent = [],
    entries = [],
    playbackReady = [];
  let handle;
  let connected = options.connected ?? true;
  const state = {
    id: options.id ?? 'session',
    room: 'gate',
    sceneKey: 'mini_arrival',
    storyMode: true,
    dialogue: { text: '' },
    flags: {},
  };
  const enter = async (mode = 'new') => {
    entries.push(mode);
    Object.assign(state, {
      id: mode === 'resume' ? 'resumed' : 'session',
      ...(mode === 'resume' ? options.saved : {}),
    });
    return state;
  };
  const voice = {
    status: 'listening',
    microphoneOn: true,
    enablePlayback: async () => true,
    submit: async (text) => handle(text),
  };
  const hook = await loadHook(
    '../../src/app/game/useGameController.ts',
    'useGameController',
    runtime,
    {
      useOpeningFlow,
      useGameSession: () => ({
        state,
        connected,
        enter,
        send: async (text) => {
          if (!state.id) await enter();
          sent.push(text);
          return { result: { state }, streamed: false };
        },
      }),
      useRoomTransition: () => ({ state, phase: 'idle' }),
      useVoice: (act) => {
        handle = act;
        return voice;
      },
      useStorySound: () => false,
      useStoryPlayback: (_state, _voice, ready) => playbackReady.push(ready),
      useDemoTour: () => ({}),
    },
  );
  return {
    runtime,
    sent,
    entries,
    voice,
    playbackReady,
    setConnected: (value) => (connected = value),
    render: () => {
      const game = runtime.render(hook);
      if (options.sceneReady === false) return game;
      game.setSceneReady(true);
      if (options.journeyReady !== false) game.setJourneyReady(true);
      return runtime.render(hook);
    },
  };
}

for (const method of ['click', 'voice']) {
  test(`${method}开始后在大巴停门画面发送第一话，随后进入山门正片`, async () => {
    const f = await fixture();
    let game = f.render();
    game.finishOpeningVideo();
    game = f.render();
    if (method === 'click') await game.begin();
    else await f.voice.submit('开始游戏');
    game = f.render();
    assert.equal(game.openingPhase, 'road');
    assert.deepEqual(f.sent, []);
    assert.equal(f.playbackReady.at(-1), false);
    await f.voice.submit('开始游戏');
    assert.deepEqual(f.sent, []);
    f.runtime.flushTimers();
    game = f.render();
    assert.equal(game.openingPhase, 'alighting');
    assert.deepEqual(f.sent, ['听第一话']);
    assert.equal(f.playbackReady.at(-1), false);
    f.runtime.flushTimers();
    game = f.render();
    assert.equal(game.openingFlow, false);
    assert.equal(f.playbackReady.at(-1), true);
    assert.deepEqual(f.sent, ['听第一话']);
    f.render();
    assert.deepEqual(f.sent, ['听第一话']);
    f.runtime.dispose();
  });
}

test('3D 开场画面尚未就绪时不计时或发送对白，画面就绪后才续行', async () => {
  const f = await fixture({ journeyReady: false });
  let game = f.render();
  game.finishOpeningVideo();
  game = f.render();
  await game.begin();
  game = f.render();
  f.runtime.flushTimers();
  game = f.render();
  assert.equal(game.openingPhase, 'road');
  assert.deepEqual(f.sent, []);
  game.setJourneyReady(true);
  f.render();
  f.runtime.flushTimers();
  game = f.render();
  assert.equal(game.openingPhase, 'alighting');
  assert.deepEqual(f.sent, []);
  game.setJourneyReady(true);
  f.render();
  assert.deepEqual(f.sent, ['听第一话']);
  f.runtime.dispose();
});

test('片头结束遇到连接延迟时等待就绪，再由首句创建会话且只发送一次', async () => {
  const f = await fixture({ id: '', connected: false });
  let game = f.render();
  game.finishOpeningVideo();
  game = f.render();
  await game.begin();
  f.render();
  f.runtime.flushTimers();
  f.render();
  f.runtime.flushTimers();
  game = f.render();
  assert.equal(game.openingPhase, 'done');
  assert.deepEqual(f.sent, []);
  assert.deepEqual(f.entries, []);
  f.setConnected(true);
  f.render();
  f.render();
  await Promise.resolve();
  assert.deepEqual(f.entries, ['new']);
  assert.deepEqual(f.sent, ['听第一话']);
  f.setConnected(false);
  f.render();
  f.setConnected(true);
  f.render();
  assert.deepEqual(f.sent, ['听第一话']);
  f.runtime.dispose();
});

for (const sceneKey of ['mini_arrival', 'mini_room']) {
  test(`恢复 ${sceneKey} 存档只重听当前对白，不插入第一话`, async () => {
    const f = await fixture({ id: '', saved: { sceneKey } });
    let game = f.render();
    game.finishOpeningVideo();
    game = f.render();
    await game.resume();
    game = f.render();
    assert.equal(game.openingFlow, false);
    assert.deepEqual(f.entries, ['resume']);
    assert.deepEqual(f.sent, ['重听当前对白']);
    f.render();
    assert.deepEqual(f.sent, ['重听当前对白']);
    f.runtime.dispose();
  });
}
