import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VoiceStatus, VoiceAnswer } from './types';
import { useSpeechOutput } from './useSpeechOutput';
import { soundSettingFor } from './soundSetting';
import { createVoiceTurns } from './voiceTurns';
import { attachAudioInput } from './audioInput';
import { createPushToTalk } from './pushToTalk';
import { bindPushToTalkKeys } from './pushToTalkKeys';
import { prepareMicrophone } from './microphoneCapture';
import type { AudioTranscription, SpeechCaption, TurnControls } from '@/shared/types/game';

export type { VoiceStatus } from './types';

export function useVoice(
  onText: (text: string, controls: TurnControls) => Promise<VoiceAnswer>,
  openTranscription: () => AudioTranscription,
) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [problem, setProblem] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [caption, setCaption] = useState<SpeechCaption | null>(null);
  const handler = useRef(onText);
  handler.current = onText;
  const transcription = useRef(openTranscription);
  transcription.current = openTranscription;
  const microphone = useRef<Awaited<ReturnType<typeof prepareMicrophone>> | null>(null);
  const wanted = useRef(false);
  const capture = useRef<ReturnType<typeof createPushToTalk> | null>(null);
  const media = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ambient = useRef<GainNode | null>(null);
  const sound = useRef(soundOn);
  sound.current = soundOn;
  const initializing = useRef(false);
  const mounted = useRef(true);

  const report = useCallback((message: string) => {
    setProblem(message);
    setStatus(wanted.current ? 'listening' : 'idle');
  }, []);
  const {
    speak,
    stream: receiveSpeech,
    stop,
  } = useSpeechOutput(wanted, sound, setStatus, audio, report);
  const turns = useMemo(
    () =>
      createVoiceTurns({
        process: (text, controls) => handler.current(text, controls),
        cancel() {
          stop();
          setCaption(null);
        },
        stream(event) {
          if (event.kind === 'start')
            setCaption({
              speaker: event.speaker || '系统',
              portrait: event.portrait || 'player',
              text: '',
            });
          else if (event.kind === 'text')
            setCaption(
              (previous) => previous && { ...previous, text: previous.text + (event.text || '') },
            );
          receiveSpeech(event);
        },
        start(text) {
          setProblem('');
          setStatus('processing');
          stop();
          const setting = soundSettingFor(text);
          if (setting !== undefined) {
            sound.current = setting;
            setSoundOn(setting);
          }
        },
        answer(answer) {
          setStatus(wanted.current ? 'listening' : 'idle');
          speak(answer);
        },
        problem(message) {
          stop();
          setCaption(null);
          report(message);
        },
      }),
    [report, speak, receiveSpeech, stop],
  );
  const submit = useCallback(
    async (text: string) => {
      capture.current?.cancel();
      await turns.submit(text);
    },
    [turns],
  );

  const start = useCallback(async () => {
    if (!mounted.current || initializing.current || wanted.current) return;
    if (!window.isSecureContext) {
      setStatus('error');
      setProblem('麦克风需要可信的 HTTPS 或本机 localhost 地址；局域网 HTTP 地址不能开启语音。');
      return;
    }
    initializing.current = true;
    setStatus('starting');
    setProblem('');
    try {
      capture.current?.dispose();
      microphone.current?.dispose();
      media.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      media.current = stream;
      if (!audio.current) audio.current = new AudioContext({ sampleRate: 16000 });
      await audio.current.resume();
      if (!mounted.current) return;
      const input = attachAudioInput(audio.current, stream, ambient.current, sound.current);
      analyser.current = input.analyser;
      ambient.current = input.ambient;
      microphone.current = await prepareMicrophone(audio.current, stream);
      if (!mounted.current) {
        microphone.current.dispose();
        return;
      }
      capture.current = createPushToTalk({
        open: () => transcription.current(),
        record: (frame) => microphone.current!.record(frame),
        interrupt() {
          turns.interrupt();
          setProblem('');
        },
        status: setStatus,
        submit: (text) => {
          void turns.submit(text);
        },
        problem: report,
      });
      wanted.current = true;
      setStatus('listening');
    } catch (cause) {
      wanted.current = false;
      setStatus('error');
      microphone.current?.dispose();
      media.current?.getTracks().forEach((track) => track.stop());
      setProblem(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? '麦克风未获授权，请检查浏览器权限。'
          : '无法启动麦克风，请检查设备是否可用。',
      );
    } finally {
      initializing.current = false;
    }
  }, [report, turns]);

  useEffect(
    () =>
      bindPushToTalkKeys(window, document, {
        enabled: () => wanted.current,
        press: () => capture.current?.press(),
        release: () => capture.current?.release(),
        cancel: () => capture.current?.cancel(),
      }),
    [],
  );

  useEffect(() => {
    if (ambient.current && audio.current)
      ambient.current.gain.setTargetAtTime(soundOn ? 0.018 : 0, audio.current.currentTime, 0.3);
    if (!soundOn) stop();
  }, [soundOn, stop]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      wanted.current = false;
      capture.current?.dispose();
      microphone.current?.dispose();
      turns.interrupt();
      media.current?.getTracks().forEach((track) => track.stop());
      void audio.current?.close();
      stop();
    };
  }, [stop, turns]);

  const level = useCallback(() => {
    if (!capture.current?.holding || !analyser.current) return 0;
    const data = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / data.length) * 5);
  }, []);

  return { status, problem, caption, start, submit, level, soundOn, setSoundOn };
}
