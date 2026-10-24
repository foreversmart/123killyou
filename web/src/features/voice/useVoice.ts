import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BrowserRecognition, VoiceStatus } from './types';
import { createRecognitionFeedback } from './recognitionFeedback';
import { useSpeechOutput } from './useSpeechOutput';
import { soundSettingFor } from './soundSetting';
import { createVoiceTurns } from './voiceTurns';

export type { VoiceStatus } from './types';

export function useVoice(onText: (text: string) => Promise<string>) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [problem, setProblem] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const handler = useRef(onText);
  handler.current = onText;
  const recognition = useRef<BrowserRecognition | null>(null);
  const wanted = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ambient = useRef<GainNode | null>(null);
  const sound = useRef(soundOn);
  sound.current = soundOn;
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failures = useRef(0);
  const active = useRef(false);
  const mounted = useRef(true);
  const recognitionFeedback = useRef<ReturnType<typeof createRecognitionFeedback> | null>(null);

  const { isEcho, speak, stop } = useSpeechOutput(wanted, sound, setStatus);

  const report = useCallback(
    (message: string) => {
      setProblem(message);
      setStatus(wanted.current ? 'listening' : 'idle');
      speak(message);
    },
    [speak],
  );

  const turns = useMemo(
    () =>
      createVoiceTurns({
        process: (text) => handler.current(text),
        start(text) {
          recognitionFeedback.current?.settle();
          setProblem('');
          setTranscript(text);
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
        problem: report,
      }),
    [report, speak, stop],
  );
  const submit = turns.submit;

  const start = useCallback(async () => {
    if (!mounted.current || active.current) return;
    clearTimeout(retry.current);
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setStatus('unsupported');
      setProblem('当前浏览器没有提供语音识别。请用 Chrome 打开本机网页；也可先观看自动演示。');
      return;
    }
    active.current = true;
    setStatus('starting');
    setProblem('');
    try {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!mounted.current) {
        stream.current.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
      if (!mounted.current) return;
      analyser.current = audio.current.createAnalyser();
      analyser.current.fftSize = 256;
      audio.current.createMediaStreamSource(stream.current).connect(analyser.current);
      if (!ambient.current) {
        // Low, filtered room air: generated locally, starts only after the user gesture.
        const buffer = audio.current.createBuffer(
          1,
          audio.current.sampleRate * 3,
          audio.current.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = audio.current.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = audio.current.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 260;
        ambient.current = audio.current.createGain();
        ambient.current.gain.value = sound.current ? 0.018 : 0;
        source.connect(filter).connect(ambient.current).connect(audio.current.destination);
        source.start();
      }
      const rec = new Constructor();
      recognitionFeedback.current?.dispose();
      const feedback = createRecognitionFeedback(report);
      recognitionFeedback.current = feedback;
      if (recognition.current) {
        const previous = recognition.current;
        previous.onstart = previous.onend = previous.onnomatch = null;
        previous.onresult = previous.onerror = null;
        previous.abort();
      }
      recognition.current = rec;
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      wanted.current = true;
      failures.current = 0;
      rec.onstart = () => {
        active.current = true;
        setStatus('listening');
      };
      rec.onresult = (event) => {
        failures.current = 0;
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript.trim();
          if (!text || isEcho(text)) continue;
          if (result.isFinal) final += text;
          else interim += text;
        }
        if (final) void submit(final);
        if (interim) {
          turns.interrupt();
          feedback.heard();
          setTranscript(interim);
          setStatus('hearing');
          stop();
        }
      };
      rec.onnomatch = () => {
        turns.interrupt();
        feedback.unmatched();
      };
      rec.onerror = (event) => {
        if (event.error === 'no-speech') {
          feedback.unfinished();
          return;
        }
        if (event.error === 'aborted') return;
        failures.current++;
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          failures.current >= 3
        ) {
          wanted.current = false;
          turns.interrupt();
          feedback.dispose();
          active.current = false;
          setStatus('error');
          setProblem(
            event.error === 'not-allowed'
              ? '麦克风未获授权。允许浏览器使用麦克风后，可重新开启会话。'
              : '浏览器语音识别服务暂时不可用。游戏画面仍可预览；七牛语音将在后续接入。',
          );
          stream.current?.getTracks().forEach((track) => track.stop());
        } else {
          feedback.settle();
          report('语音识别刚才中断了，正在重连，请稍后再说一次。');
        }
      };
      rec.onend = () => {
        active.current = false;
        if (!wanted.current) return;
        feedback.unfinished();
        const restart = () => {
          if (!wanted.current) return;
          try {
            rec.start();
          } catch {
            retry.current = setTimeout(restart, 1200);
          }
        };
        retry.current = setTimeout(restart, failures.current ? 1800 : 300);
      };
      rec.start();
    } catch (cause) {
      wanted.current = false;
      active.current = false;
      setStatus('error');
      stream.current?.getTracks().forEach((track) => track.stop());
      setProblem(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? '麦克风未获授权，请检查浏览器权限。'
          : '无法启动麦克风，请检查设备是否可用。',
      );
    }
  }, [isEcho, report, stop, submit, turns]);

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
      turns.interrupt();
      clearTimeout(retry.current);
      recognitionFeedback.current?.dispose();
      recognition.current?.abort();
      stream.current?.getTracks().forEach((track) => track.stop());
      void audio.current?.close();
      stop();
    };
  }, [stop, turns]);

  const level = useCallback(() => {
    if (!analyser.current) return 0;
    const data = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / data.length) * 5);
  }, []);

  return {
    status,
    transcript,
    problem,
    start,
    submit,
    level,
    soundOn,
    setSoundOn,
  };
}
