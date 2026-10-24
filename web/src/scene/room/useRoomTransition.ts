import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';

export type RoomPhase = 'idle' | 'leaving' | 'black' | 'entering';

export function useRoomTransition(incoming: GameState | null) {
  const [state, setState] = useState(incoming);
  const [phase, setPhase] = useState<RoomPhase>('idle');
  const displayed = useRef(incoming);
  const latest = useRef(incoming);
  const currentPhase = useRef<RoomPhase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  latest.current = incoming;

  useEffect(() => {
    if (!incoming) return;
    const clearTimers = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const changePhase = (next: RoomPhase) => {
      currentPhase.current = next;
      setPhase(next);
    };
    const commit = (next: GameState) => {
      displayed.current = next;
      setState(next);
    };
    const schedule = (callback: () => void, delay: number) => {
      timers.current.push(setTimeout(callback, delay));
    };
    const reveal = () => {
      schedule(
        () => {
          changePhase('entering');
          schedule(() => changePhase('idle'), reducedMotion.current ? 40 : 440);
        },
        reducedMotion.current ? 80 : 140,
      );
    };

    if (!displayed.current) {
      commit(incoming);
      return;
    }

    if (incoming.room === displayed.current.room) {
      commit(incoming);
      // A second voice command can return to the visible room before blackout.
      if (currentPhase.current === 'leaving') {
        clearTimers();
        changePhase('entering');
        schedule(() => changePhase('idle'), reducedMotion.current ? 40 : 440);
      }
      return;
    }

    // Keep the outgoing scene until fully covered. Further requests update
    // latest.current rather than restarting the fade or showing intermediate rooms.
    if (currentPhase.current === 'leaving') return;

    clearTimers();
    if (currentPhase.current === 'black') {
      commit(incoming);
      reveal();
      return;
    }

    changePhase('leaving');
    schedule(
      () => {
        changePhase('black');
        if (latest.current) commit(latest.current);
        // Give both React and the PixiJS ticker time to paint the new room in black.
        reveal();
      },
      reducedMotion.current ? 40 : 340,
    );
  }, [incoming]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  return { state, phase };
}
