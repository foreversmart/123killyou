import { useEffect, useRef } from 'react';
import type { GameState } from '@/shared/types/game';
import type { useVoice } from '@/features/voice/useVoice';

// Leave a visible breath after a voiced line. The next shot may need to settle
// on a prop or sound source before the following character speaks.
const PLAYBACK_ADVANCE_DELAY_MS = 1400;
const SCRIPTURE_ADVANCE_DELAY_MS = 1800;
const SILENT_ADVANCE_DELAY_MS = 4000;
const MEAL_EATING_ADVANCE_DELAY_MS = 5000;
const FOUR_KNOCKS_AUTO_ADVANCE = '自动进入三敲';
const FOUR_KNOCKS_AUTO_ADVANCE_DELAY_MS = 5000;
const THREE_KNOCKS_DIALOGUE_ADVANCE = '三敲后听同行';
// Three knocks are scheduled at 0, 0.85 and 1.7 seconds and each wooden
// impact rings for about 1.1 seconds. Leave a short quiet tail after the
// third impact before the companion speaks.
const THREE_KNOCKS_DIALOGUE_ADVANCE_DELAY_MS = 3200;
const DAWN_KNOCKS_DIALOGUE_ADVANCE = '三敲后听假同行';
const DAWN_KNOCKS_DIALOGUE_ADVANCE_DELAY_MS = 3200;
const ESCAPE_DIALOGUE_ADVANCE = '自动显示逃脱对白';
const ESCAPE_DIALOGUE_ADVANCE_DELAY_MS = 1800;
const DAWN_SLEEP_ADVANCE = '自动进入四声更锣';
const DAWN_SLEEP_ADVANCE_DELAY_MS = 5000;
const MEAL_GROUP_ADVANCE_DELAY_MS = 1400;
const DELAYED_DEATH_ADVANCE = '自动进入死亡结算';
// The wait hook starts after the two heavy impacts finish. Leave only the
// requested half-second gap before the door opens and the ghost enters.
const DELAYED_DEATH_ADVANCE_DELAY_MS = 500;
const SLEEP_ADVANCE = '自动进入三更';
const SLEEP_ADVANCE_DELAY_MS = 5000;
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
      next === DELAYED_DEATH_ADVANCE
        ? DELAYED_DEATH_ADVANCE_DELAY_MS
        : next === SLEEP_ADVANCE
          ? SLEEP_ADVANCE_DELAY_MS
          : next === '自动离开斋堂'
            ? state.flags.meal_group_pending
              ? MEAL_GROUP_ADVANCE_DELAY_MS
              : state.flags.refectory_meal_finished
                ? PLAYBACK_ADVANCE_DELAY_MS
                : MEAL_EATING_ADVANCE_DELAY_MS
            : next === FOUR_KNOCKS_AUTO_ADVANCE
              ? FOUR_KNOCKS_AUTO_ADVANCE_DELAY_MS
              : next === THREE_KNOCKS_DIALOGUE_ADVANCE
                ? THREE_KNOCKS_DIALOGUE_ADVANCE_DELAY_MS
                : next === DAWN_KNOCKS_DIALOGUE_ADVANCE
                  ? DAWN_KNOCKS_DIALOGUE_ADVANCE_DELAY_MS
                  : next === ESCAPE_DIALOGUE_ADVANCE
                    ? ESCAPE_DIALOGUE_ADVANCE_DELAY_MS
                    : next === DAWN_SLEEP_ADVANCE
                      ? DAWN_SLEEP_ADVANCE_DELAY_MS
                      : AUTOMATIC_SAFE_ACTIONS.has(next) ||
                          next.startsWith('自动') ||
                          !voice.playbackOn
                        ? SILENT_ADVANCE_DELAY_MS
                        : next === '继续念经'
                          ? SCRIPTURE_ADVANCE_DELAY_MS
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
    state?.flags.sleep_pending,
    next,
    state?.flags.meal_group_pending,
    state?.flags.refectory_meal_finished,
    ready,
    voice.status,
    voice.playbackProblem,
    voice.playbackOn,
    voice.submit,
  ]);
}
