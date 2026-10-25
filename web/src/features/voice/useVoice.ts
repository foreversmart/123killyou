import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VoiceStatus, VoiceAnswer } from '@/features/voice/types';
import { useSpeechOutput } from '@/features/voice/useSpeechOutput';
import { createVoiceTurns } from '@/features/voice/voiceTurns';
import { attachAudioInput } from '@/features/voice/audioInput';
import { createPushToTalk } from '@/features/voice/pushToTalk';
import { bindPushToTalkKeys } from '@/features/voice/pushToTalkKeys';
import { prepareMicrophone } from '@/features/voice/microphoneCapture';
import { resumeAudioContext } from '@/features/voice/playbackContext';
import type { AudioTranscription, SpeechCaption, TurnControls } from '@/shared/types/game';

export type { VoiceStatus } from '@/features/voice/types';

export function useVoice(
  onText: (text: string, controls: TurnControls) => Promise<VoiceAnswer>,
  openTranscription: () => AudioTranscription,
) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [problem, setProblem] = useState('');
  const [microphoneProblem, setMicrophoneProblem] = useState('');
  const [playbackOn, setPlaybackOn] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [caption, setCaption] = useState<SpeechCaption | null>(null);
  const handler = useRef(onText);
  handler.current = onText;
  const transcription = useRef(openTranscription);
  transcription.current = openTranscription;
  const microphone = useRef<Awaited<ReturnType<typeof prepareMicrophone>> | null>(null);
  const wanted = useRef(false);
  const outputEnabled = useRef(false);
  const capture = useRef<ReturnType<typeof createPushToTalk> | null>(null);
  const media = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ambient = useRef<GainNode | null>(null);
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
  } = useSpeechOutput(outputEnabled, wanted, setStatus, audio, report);
  const enablePlayback = useCallback(async () => {
    setProblem('');
    try {
      // Resume synchronously within the click gesture, before any microphone permission request.
      await resumeAudioContext(audio);
      if (!mounted.current) return false;
      outputEnabled.current = true;
      setPlaybackOn(true);
      return true;
    } catch {
      outputEnabled.current = false;
      setPlaybackOn(false);
      report('浏览器未能启动音频播放，请检查浏览器播放权限后重试。');
      return false;
    }
  }, [report]);
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
              portrait: event.portrait || '',
              text: '',
            });
          else if (event.kind === 'text')
            setCaption(
              (previous) => previous && { ...previous, text: previous.text + (event.text || '') },
            );
          receiveSpeech(event);
        },
        start() {
          setProblem('');
          setStatus('processing');
          stop();
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
    if (wanted.current) return true;
    if (!mounted.current || initializing.current) return false;
    const playback = enablePlayback();
    if (!window.isSecureContext) {
      setStatus('error');
      setMicrophoneProblem(
        '麦克风需要可信的 HTTPS 或本机 localhost 地址；局域网 HTTP 地址不能开启语音。',
      );
      return false;
    }
    initializing.current = true;
    setStatus('starting');
    setMicrophoneProblem('');
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
        return false;
      }
      media.current = stream;
      if (!(await playback) || !audio.current) throw new Error('Audio playback unavailable');
      if (!mounted.current) return false;
      const input = attachAudioInput(audio.current, stream, ambient.current);
      analyser.current = input.analyser;
      ambient.current = input.ambient;
      microphone.current = await prepareMicrophone(audio.current, stream);
      if (!mounted.current) {
        microphone.current.dispose();
        return false;
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
      setMicrophoneOn(true);
      setStatus('listening');
      return true;
    } catch (cause) {
      wanted.current = false;
      setMicrophoneOn(false);
      setStatus('error');
      microphone.current?.dispose();
      media.current?.getTracks().forEach((track) => track.stop());
      setMicrophoneProblem(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? '麦克风未获授权，请检查浏览器权限。'
          : '无法启动麦克风，请检查设备是否可用。',
      );
      return false;
    } finally {
      initializing.current = false;
    }
  }, [enablePlayback, report, turns]);

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
    mounted.current = true;
    return () => {
      mounted.current = false;
      wanted.current = false;
      outputEnabled.current = false;
      capture.current?.dispose();
      microphone.current?.dispose();
      turns.interrupt();
      media.current?.getTracks().forEach((track) => track.stop());
      void audio.current?.close();
      audio.current = null;
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

  return {
    status,
    problem: problem || microphoneProblem,
    playbackProblem: problem,
    microphoneProblem,
    playbackOn,
    microphoneOn,
    caption,
    start,
    enablePlayback,
    submit,
    level,
  };
}
