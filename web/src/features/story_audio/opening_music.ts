import { useEffect, useRef } from 'react';
import {
  OPENING_BACKGROUND_MUSIC,
  OPENING_BACKGROUND_MUSIC_ARRIVAL_VOLUME,
  OPENING_BACKGROUND_MUSIC_FADE_MS,
  OPENING_BACKGROUND_MUSIC_VOLUME,
} from './music';

export function useOpeningMusic(
  phase: string | undefined,
  paused: boolean | undefined,
  unlocked: boolean,
) {
  const player = useRef<HTMLAudioElement | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(false);
  const started = useRef(false);
  const openingActive = phase === 'road' || phase === 'alighting';
  const arrival = phase === 'alighting';

  useEffect(() => {
    if (!openingActive) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = undefined;
      active.current = false;
      started.current = false;
      if (player.current) {
        player.current.pause();
        player.current.currentTime = 0;
        player.current.volume = OPENING_BACKGROUND_MUSIC_VOLUME;
      }
      return;
    }

    active.current = true;
    if (!unlocked || paused) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = undefined;
      player.current?.pause();
      return;
    }

    if (!player.current && typeof Audio !== 'undefined') {
      const next = new Audio(OPENING_BACKGROUND_MUSIC);
      next.loop = true;
      next.preload = 'auto';
      next.volume = OPENING_BACKGROUND_MUSIC_VOLUME;
      player.current = next;
    }
    const current = player.current;
    if (!current) return;

    clearTimeout(fadeTimer.current);
    fadeTimer.current = undefined;
    const target = arrival
      ? OPENING_BACKGROUND_MUSIC_ARRIVAL_VOLUME
      : OPENING_BACKGROUND_MUSIC_VOLUME;
    if (arrival && current.volume > target + 0.001) {
      const start = current.volume;
      const steps = Math.max(1, Math.ceil(OPENING_BACKGROUND_MUSIC_FADE_MS / 50));
      let step = 0;
      const fade = () => {
        step += 1;
        current.volume = start + (target - start) * Math.min(1, step / steps);
        if (step < steps && active.current && !paused) {
          fadeTimer.current = setTimeout(fade, 50);
        } else {
          fadeTimer.current = undefined;
        }
      };
      fadeTimer.current = setTimeout(fade, 50);
    } else {
      current.volume = target;
    }

    if (started.current) {
      if (current.paused) void current.play().catch(() => {});
      return;
    }
    void current.play().then(
      () => {
        started.current = true;
      },
      () => {
        started.current = false;
      },
    );
  }, [arrival, openingActive, paused, unlocked]);

  useEffect(
    () => () => {
      clearTimeout(fadeTimer.current);
      player.current?.pause();
      player.current = null;
    },
    [],
  );
}
