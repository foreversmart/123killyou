import { useCallback, useEffect, useRef, useState } from 'react';
import { OPENING_ROAD_DURATION_MS, OPENING_ALIGHTING_DURATION_MS } from '@/shared/lib/story_timing';

type OpeningPhase = 'reel' | 'ready' | 'road' | 'alighting' | 'done';

export function useOpeningFlow(paused = false) {
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('reel');
  const [journeyReady, setJourneyReady] = useState(false);
  const openingGate = useRef<OpeningPhase>('reel');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dueAt = useRef<number | undefined>(undefined);
  const remaining = useRef<number | undefined>(undefined);
  const timerPhase = useRef<OpeningPhase | undefined>(undefined);
  const changePhase = useCallback((phase: OpeningPhase) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    dueAt.current = undefined;
    remaining.current = undefined;
    timerPhase.current = undefined;
    setJourneyReady(false);
    openingGate.current = phase;
    setOpeningPhase(phase);
  }, []);
  const finishOpeningVideo = useCallback(() => {
    if (openingGate.current === 'reel') changePhase('ready');
  }, [changePhase]);
  const startOpening = useCallback(() => {
    if (openingGate.current !== 'ready') return;
    changePhase('road');
  }, [changePhase]);
  const finishOpening = useCallback(() => changePhase('done'), [changePhase]);

  useEffect(() => {
    if (!journeyReady || (openingPhase !== 'road' && openingPhase !== 'alighting')) return;
    const duration =
      openingPhase === 'road' ? OPENING_ROAD_DURATION_MS : OPENING_ALIGHTING_DURATION_MS;
    if (timerPhase.current !== openingPhase) {
      timerPhase.current = openingPhase;
      remaining.current = duration;
    }
    if (paused) return;
    const delay = Math.max(0, remaining.current ?? duration);
    dueAt.current = Date.now() + delay;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      dueAt.current = undefined;
      remaining.current = undefined;
      timerPhase.current = undefined;
      changePhase(openingPhase === 'road' ? 'alighting' : 'done');
    }, delay);
    return () => {
      if (timer.current) {
        // React runs the previous effect cleanup before the paused render's
        // effect. Preserve the unfinished portion before cancelling it.
        remaining.current = Math.max(0, (dueAt.current ?? Date.now()) - Date.now());
        clearTimeout(timer.current);
        timer.current = undefined;
      }
    };
  }, [changePhase, openingPhase, journeyReady, paused]);

  useEffect(() => {
    if (!paused || !timer.current || dueAt.current === undefined) return;
    remaining.current = Math.max(0, dueAt.current - Date.now());
    clearTimeout(timer.current);
    timer.current = undefined;
    dueAt.current = undefined;
  }, [paused]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return {
    openingPhase,
    openingGate,
    finishOpeningVideo,
    startOpening,
    finishOpening,
    journeyReady,
    setJourneyReady,
  };
}
