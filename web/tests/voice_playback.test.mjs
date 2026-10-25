import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPCMPlayer } from '../src/features/voice/pcmPlayer.ts';
import { createVoiceTurns } from '../src/features/voice/voiceTurns.ts';
import { audioFixture, hookRuntime, loadHook } from './helpers/hook_runtime.mjs';

const pcm = Buffer.alloc(1920 * 2).toString('base64');

async function fixture() {
  const runtime = hookRuntime();
  const audio = audioFixture();
  const resumeAudioContext = await loadHook(
    '../../src/features/voice/playbackContext.ts',
    'resumeAudioContext',
    runtime,
    audio,
  );
  const useSpeechOutput = await loadHook(
    '../../src/features/voice/useSpeechOutput.ts',
    'useSpeechOutput',
    runtime,
    { createPCMPlayer },
  );
  let micRequests = 0;
  const useVoice = await loadHook('../../src/features/voice/useVoice.ts', 'useVoice', runtime, {
    useSpeechOutput,
    resumeAudioContext,
    createVoiceTurns,
    window: { isSecureContext: true },
    document: {},
    navigator: {
      mediaDevices: {
        async getUserMedia() {
          micRequests++;
          throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
        },
      },
    },
    bindPushToTalkKeys: () => () => {},
    attachAudioInput: () => assert.fail('Denied microphone must not attach audio input'),
    createPushToTalk: () => assert.fail('Denied microphone must not start recording'),
    prepareMicrophone: () => assert.fail('Denied microphone must not create worklet'),
  });
  const requests = [];
  const process = async (text, controls) => {
    requests.push(text);
    controls.onSpeech({ kind: 'start', speaker: '门外声源', portrait: '', sampleRate: 16000 });
    controls.onSpeech({ kind: 'text', text: '是我，开门。' });
    controls.onSpeech({ kind: 'audio', pcm });
    return { text: '是我，开门。', streamed: true };
  };
  const render = () =>
    runtime.render(useVoice, process, () => assert.fail('No recognition expected'));
  return { runtime, audio, requests, render, micRequests: () => micRequests, resumeAudioContext };
}

test('开始旅程的点击同步解锁播放，不请求麦克风；关闭的 AudioContext 可重建', async () => {
  const f = await fixture();
  const voice = f.render();
  const pending = voice.enablePlayback();
  assert.deepEqual(f.audio.calls, [['create', 16000], ['resume']]);
  assert.equal(f.micRequests(), 0);
  assert.equal(await pending, true);
  assert.equal(f.render().playbackOn, true);
  assert.equal(f.render().microphoneOn, false);
  const ref = { current: null };
  await f.resumeAudioContext(ref);
  const first = ref.current;
  await f.resumeAudioContext(ref);
  assert.equal(ref.current, first);
  await first.close();
  await f.resumeAudioContext(ref);
  assert.notEqual(ref.current, first);
  f.runtime.dispose();
});

test('麦克风拒绝后 NPC 输出和未知声源字幕继续；下一句不能清除权限错误', async () => {
  const f = await fixture();
  let voice = f.render();
  assert.equal(await voice.start(), false);
  voice = f.render();
  assert.equal(f.micRequests(), 1);
  assert.match(voice.microphoneProblem, /未获授权/);
  assert.equal(voice.playbackOn, true);
  assert.equal(voice.microphoneOn, false);
  await voice.submit('重听当前对白');
  voice = f.render();
  assert.equal(voice.status, 'speaking');
  assert.equal(voice.playbackProblem, '');
  assert.match(voice.problem, /未获授权/);
  assert.deepEqual(voice.caption, { speaker: '门外声源', portrait: '', text: '是我，开门。' });
  assert.equal(f.audio.sources.length, 1);
  f.audio.sources[0].end();
  assert.equal(f.render().status, 'idle');
  assert.deepEqual(f.requests, ['重听当前对白']);
  assert.match(f.render().microphoneProblem, /未获授权/);
  f.runtime.dispose();
});

test('播放完成根据实际麦克风状态待机，打断后的旧音频不能改变新回合状态', async () => {
  const runtime = hookRuntime(),
    audio = audioFixture();
  const useSpeechOutput = await loadHook(
    '../../src/features/voice/useSpeechOutput.ts',
    'useSpeechOutput',
    runtime,
    { createPCMPlayer },
  );
  const statuses = [],
    microphone = { current: true },
    context = new audio.AudioContext();
  const output = runtime.render(
    useSpeechOutput,
    { current: true },
    microphone,
    (status) => statuses.push(status),
    { current: context },
    (message) => assert.fail(message),
  );
  output.stream({ kind: 'start', sampleRate: 16000 });
  output.stream({ kind: 'audio', pcm });
  output.speak({ text: '陆沉的对白', streamed: true });
  audio.sources[0].end();
  assert.equal(statuses.at(-1), 'listening');
  output.stream({ kind: 'start', sampleRate: 16000 });
  output.stream({ kind: 'audio', pcm });
  output.stop();
  statuses.push('processing');
  audio.sources[1].end();
  assert.equal(statuses.at(-1), 'processing');
  assert.equal(audio.sources[1].stopped, true);
  runtime.dispose();
});

test('场景反馈不要求语音流，也不播放环境描述', async () => {
  const runtime = hookRuntime(),
    audio = audioFixture();
  const useSpeechOutput = await loadHook(
    '../../src/features/voice/useSpeechOutput.ts',
    'useSpeechOutput',
    runtime,
    { createPCMPlayer },
  );
  const output = runtime.render(
    useSpeechOutput,
    { current: true },
    { current: false },
    () => assert.fail('Scene observation must not enter speech playback'),
    { current: new audio.AudioContext() },
    (message) => assert.fail(message),
  );
  output.speak({ text: '', sceneOnly: true });
  assert.equal(audio.sources.length, 0);
  runtime.dispose();
});
