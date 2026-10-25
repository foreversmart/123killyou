import type { VoiceAnswer } from './types';
import type { SpeechEvent, TurnControls } from '@/shared/types/game';

type TurnHandlers = {
  process: (text: string, controls: TurnControls) => Promise<VoiceAnswer>;
  start: (text: string) => void;
  answer: (answer: VoiceAnswer) => void;
  problem: (message: string) => void;
  stream?: (event: SpeechEvent) => void;
  cancel?: () => void;
};

// Pressing the talk key interrupts before ASR produces its final transcript.
// Keep committed actions, but suppress stale speech and errors as soon as they speak.
export function createVoiceTurns(handlers: TurnHandlers) {
  let generation = 0;
  let active: AbortController | null = null;
  const interrupt = () => {
    generation++;
    active?.abort();
    active = null;
    handlers.cancel?.();
  };
  return {
    interrupt,
    async submit(text: string) {
      interrupt();
      const turn = ++generation;
      const controller = new AbortController();
      active = controller;
      handlers.start(text);
      try {
        const answer = await handlers.process(text, {
          signal: controller.signal,
          onSpeech(event) {
            if (turn === generation && !controller.signal.aborted) handlers.stream?.(event);
          },
        });
        if (turn !== generation) return;
        if (typeof answer !== 'string' && answer.problem) throw new Error(answer.problem);
        if (
          !(typeof answer === 'string' ? answer : answer.text).trim() &&
          !(typeof answer !== 'string' && answer.sceneOnly)
        )
          throw new Error('听见了，但这次没有收到完整回应。请再说一次。');
        handlers.answer(answer);
      } catch (cause) {
        if (turn !== generation) return;
        handlers.problem(cause instanceof Error ? cause.message : '回应暂时中断，请稍后再说一次。');
      } finally {
        if (active === controller) active = null;
      }
    },
  };
}
