import { useCallback, useEffect, useRef, useState } from 'react';

type OpeningPhase = 'reel' | 'ready' | 'road' | 'alighting' | 'done';

// Keep the two opening shots long enough for the route and the stopped bus to
// register before the story dialogue starts. The journey gets an extra second
// and the gate shot an extra second compared with the original cut.
export const OPENING_ROAD_DURATION_MS = 3000;
export const OPENING_ALIGHTING_DURATION_MS = 4000;

export function useOpeningFlow() {
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('reel');
  const openingGate = useRef<OpeningPhase>('reel');
  const changePhase = useCallback((phase: OpeningPhase) => {
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
    if (openingPhase !== 'road' && openingPhase !== 'alighting') return;
    const timer = setTimeout(
      () => changePhase(openingPhase === 'road' ? 'alighting' : 'done'),
      // Let the bus settle before the outside scene and its dialogue begin.
      openingPhase === 'road' ? OPENING_ROAD_DURATION_MS : OPENING_ALIGHTING_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [changePhase, openingPhase]);

  return { openingPhase, openingGate, finishOpeningVideo, startOpening, finishOpening };
}
