import { useCallback, useRef } from 'react';
import type { VoiceStatus } from './types';

const clean = (text: string) => text.replace(/[\s\p{P}]/gu, '');

export function useSpeechOutput(
  enabled: { current: boolean },
  sound: { current: boolean },
  setStatus: (status: VoiceStatus) => void,
) {
  const spoken = useRef({ text: '', until: 0 });
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    spoken.current.until = Math.min(spoken.current.until, performance.now() + 900);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }, []);
  const isEcho = useCallback((text: string) => {
    const normalized = clean(text);
    return (
      normalized.length > 3 &&
      performance.now() < spoken.current.until &&
      spoken.current.text.includes(normalized)
    );
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!sound.current || !('speechSynthesis' in window) || !enabled.current) return;
      stop();
      const turn = generation.current;
      spoken.current = {
        text: clean(text),
        until: performance.now() + Math.max(text.length * 500, 7000),
      };
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.88;
      utterance.pitch = 0.86;
      utterance.volume = 0.85;
      const voices = speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === 'zh-CN') || voices.find((v) => v.lang.startsWith('zh'));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (turn === generation.current && enabled.current) setStatus('speaking');
      };
      utterance.onend = () => {
        if (turn !== generation.current) return;
        spoken.current.until = performance.now() + 900;
        if (enabled.current) setStatus('listening');
      };
      utterance.onerror = () => {
        if (turn === generation.current && enabled.current) setStatus('listening');
      };
      speechSynthesis.speak(utterance);
    },
    [enabled, sound, setStatus, stop],
  );

  return { isEcho, speak, stop };
}
