import { useCallback, useEffect, useRef, useState } from 'react';
import { OPENING_ROAD_DURATION_MS, OPENING_ALIGHTING_DURATION_MS } from '@/shared/lib/story_timing';

type OpeningPhase = 'reel' | 'ready' | 'road' | 'alighting' | 'done';

export function useOpeningFlow() {
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('reel');
  const [journeyReady, setJourneyReady] = useState(false);
  const openingGate = useRef<OpeningPhase>('reel');
  const changePhase = useCallback((phase: OpeningPhase) => {
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
    const timer = setTimeout(
      () => changePhase(openingPhase === 'road' ? 'alighting' : 'done'),
      // Let the bus settle before the outside scene and its dialogue begin.
      openingPhase === 'road' ? OPENING_ROAD_DURATION_MS : OPENING_ALIGHTING_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [changePhase, openingPhase, journeyReady]);

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
