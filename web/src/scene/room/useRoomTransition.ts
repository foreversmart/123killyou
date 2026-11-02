import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';

export type RoomPhase = 'idle' | 'leaving' | 'black' | 'entering';

type TransitionTimer = {
  callback: () => void;
  dueAt: number;
  remaining?: number;
  handle?: ReturnType<typeof setTimeout>;
  run?: () => void;
};

export function useRoomTransition(incoming: GameState | null) {
  const [state, setState] = useState(incoming);
  const [phase, setPhase] = useState<RoomPhase>('idle');
  const displayed = useRef(incoming);
  const latest = useRef(incoming);
  const currentPhase = useRef<RoomPhase>('idle');
  const timers = useRef<TransitionTimer[]>([]);
  const paused = useRef(Boolean(incoming?.paused));
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  latest.current = incoming;

  useEffect(() => {
    if (!incoming) return;
    const clearTimers = () => {
      timers.current.forEach((timer) => {
        if (timer.handle) clearTimeout(timer.handle);
      });
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
      const timer: TransitionTimer = { callback, dueAt: Date.now() + delay };
      timer.run = () => {
        timers.current = timers.current.filter((active) => active !== timer);
        timer.handle = undefined;
        callback();
      };
      if (!incoming.paused) timer.handle = setTimeout(timer.run, delay);
      timers.current.push(timer);
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

    if (incoming.paused !== paused.current) {
      if (incoming.paused) {
        timers.current.forEach((timer) => {
          timer.remaining = Math.max(0, timer.dueAt - Date.now());
          if (timer.handle) clearTimeout(timer.handle);
          timer.handle = undefined;
        });
      } else {
        timers.current.forEach((timer) => {
          const delay = timer.remaining ?? Math.max(0, timer.dueAt - Date.now());
          timer.dueAt = Date.now() + delay;
          timer.handle = setTimeout(timer.run || timer.callback, delay);
          timer.remaining = undefined;
        });
      }
      paused.current = incoming.paused;
    }

    if (incoming.paused) {
      // A paused snapshot can still update dialogue and overlays, but must not
      // start or advance a room fade until the player resumes.
      if (displayed.current && incoming.room === displayed.current.room) commit(incoming);
      return;
    }

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
      timers.current.forEach((timer) => {
        if (timer.handle) clearTimeout(timer.handle);
      });
    },
    [],
  );

  return { state, phase };
}
