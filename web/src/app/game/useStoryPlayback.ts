import { useEffect, useRef } from 'react';
import type { GameState } from '@/shared/types/game';
import type { useVoice } from '@/features/voice/useVoice';

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
      !voice.soundOn ||
      !voice.playbackOn ||
      voice.playbackProblem ||
      !['idle', 'listening'].includes(voice.status)
    )
      return;
    const key = `${state.id}:${state.runId}:${state.revision}:${next}`;
    if (submitted.current === key) return;
    const timer = setTimeout(() => {
      submitted.current = key;
      void voice.submit(next);
    }, 650);
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
