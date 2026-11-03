import { useMemo, useRef } from 'react';

/** The overlay and its cut share the exact time already drawn by WorldView. */
export function useTravelClock({
  phaseKey,
  durationMs,
  ready,
  paused,
  onComplete,
}: {
  phaseKey: string;
  durationMs: number;
  ready: boolean;
  paused: boolean;
  onComplete: () => void;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const playback = useMemo(() => ({ completed: false }), [phaseKey]);
  const onElapsed = (seconds: number) => {
    const elapsedMs = Math.max(0, Math.min(durationMs, seconds * 1000));
    overlay.current?.style.setProperty('--travel-elapsed', `${-elapsedMs}ms`);
    if (!ready || paused || playback.completed || elapsedMs < durationMs) return;
    playback.completed = true;
    onComplete();
  };
  return { overlay, onElapsed };
}
