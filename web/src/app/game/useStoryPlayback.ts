import { useEffect, useRef } from 'react';
import type { GameState } from '@/shared/types/game';
import type { useVoice } from '@/features/voice/useVoice';

const PLAYBACK_ADVANCE_DELAY_MS = 650;
const SILENT_ADVANCE_DELAY_MS = 4000;
const AUTOMATIC_SAFE_ACTIONS = new Set([
  '自动登记入住',
  '自动放好行李',
  '自动去斋堂',
  '自动结束晚膳',
]);

export function useStoryPlayback(
  state: GameState | null,
  voice: ReturnType<typeof useVoice>,
  ready: boolean,
) {
  const submitted = useRef('');
  const next = state?.dialogueNext || '';
  useEffect(() => {
    if (
      !state?.id ||
      !next ||
      !ready ||
      state.paused ||
      state.overlay ||
      state.flags.story_dead ||
      voice.playbackProblem ||
      !['idle', 'listening'].includes(voice.status)
    )
      return;
    const key = `${state.id}:${state.runId}:${state.revision}:${next}`;
    if (submitted.current === key) return;
    const delay =
      AUTOMATIC_SAFE_ACTIONS.has(next) ||
      next.startsWith('自动') ||
      !(voice.soundOn && voice.playbackOn)
        ? SILENT_ADVANCE_DELAY_MS
        : PLAYBACK_ADVANCE_DELAY_MS;
    const timer = setTimeout(() => {
      submitted.current = key;
      void voice.submit(next);
    }, delay);
    return () => clearTimeout(timer);
  }, [
    state?.id,
    state?.runId,
    state?.revision,
    state?.paused,
    state?.overlay,
    state?.flags.story_dead,
    next,
    ready,
    voice.status,
    voice.playbackProblem,
    voice.playbackOn,
    voice.soundOn,
    voice.submit,
  ]);
}
