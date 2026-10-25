import { useCallback, useRef } from 'react';
import type { VoiceStatus, VoiceAnswer } from '@/features/voice/types';
import type { SpeechEvent } from '@/shared/types/game';
import { createPCMPlayer } from '@/features/voice/pcmPlayer';

export function useSpeechOutput(
  enabled: { current: boolean },
  microphone: { current: boolean },
  sound: { current: boolean },
  setStatus: (status: VoiceStatus) => void,
  audio: { current: AudioContext | null },
  onProblem: (message: string) => void,
) {
  const generation = useRef(0);
  const player = useRef<ReturnType<typeof createPCMPlayer> | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    player.current?.stop();
    player.current = null;
  }, []);

  const stream = useCallback(
    (event: SpeechEvent) => {
      if (event.kind === 'start') {
        stop();
        if (!enabled.current || !sound.current || !audio.current) return;
        const turn = generation.current;
        player.current = createPCMPlayer(audio.current, event.sampleRate || 0, () => {
          if (turn !== generation.current) return;
          setStatus(microphone.current ? 'listening' : 'idle');
        });
        void audio.current.resume().catch(() => {
          if (turn !== generation.current) return;
          stop();
          onProblem('浏览器未能启动音频播放，请检查声音设置后重试。');
        });
      } else if (event.kind === 'audio' && player.current) {
        if (!event.pcm) throw new Error('灵矽返回了空的音频片段。');
        const raw = atob(event.pcm);
        const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
        player.current.push(bytes);
        setStatus('speaking');
      }
    },
    [enabled, microphone, sound, setStatus, audio, stop, onProblem],
  );

  const speak = useCallback(
    (answer: VoiceAnswer) => {
      if (typeof answer !== 'string' && answer.sceneOnly) return;
      if (!sound.current || !enabled.current) return;
      if (typeof answer === 'string' || !answer.streamed || !player.current?.received) {
        stop();
        onProblem('灵矽没有提供可播放的语音，请稍后再试。');
        return;
      }
      player.current.finish();
      if (player.current.playing) setStatus('speaking');
    },
    [enabled, sound, setStatus, stop, onProblem],
  );

  return { speak, stream, stop };
}
