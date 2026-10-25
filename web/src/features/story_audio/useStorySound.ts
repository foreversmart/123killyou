import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import type { VoiceStatus } from '@/features/voice/types';
import { cueDuration, cueSignature, storyCues } from './cues';
import {
  NIGHT_BACKGROUND_MUSIC,
  NIGHT_BACKGROUND_MUSIC_DELAY_MS,
  shouldPlayNightBackground,
} from './music';
import { playStoryCue } from './synthesis';

export function useStorySound(state: GameState | null, voiceStatus: VoiceStatus) {
  const context = useRef<AudioContext | null>(null);
  const sources = useRef<AudioScheduledSourceNode[]>([]);
  const played = useRef(new Set<string>());
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const volumeNode = useRef<GainNode | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const musicTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const musicRunId = useRef('');
  const musicStarted = useRef(false);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const unlock = () => {
      if (!context.current) context.current = new AudioContext();
      void context.current.resume().then(
        () => setUnlocked(true),
        () => {},
      );
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      clearTimeout(finishTimer.current);
      clearTimeout(musicTimer.current);
      sources.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      });
      music.current?.pause();
      music.current = null;
      void context.current?.close();
    };
  }, []);

  const nightBackgroundActive = shouldPlayNightBackground(state);
  const nightRunId = state?.runId || '';
  useEffect(() => {
    if (!nightBackgroundActive) {
      clearTimeout(musicTimer.current);
      musicTimer.current = undefined;
      musicStarted.current = false;
      musicRunId.current = '';
      if (music.current) {
        music.current.pause();
        music.current.currentTime = 0;
      }
      return;
    }

    if (musicRunId.current !== nightRunId) {
      clearTimeout(musicTimer.current);
      musicTimer.current = undefined;
      musicStarted.current = false;
      musicRunId.current = nightRunId;
      if (music.current) {
        music.current.pause();
        music.current.currentTime = 0;
      }
    }

    if (!unlocked || state?.paused) {
      clearTimeout(musicTimer.current);
      musicTimer.current = undefined;
      music.current?.pause();
      return;
    }

    if (!music.current && typeof Audio !== 'undefined') {
      const player = new Audio(NIGHT_BACKGROUND_MUSIC);
      player.loop = true;
      player.preload = 'auto';
      player.volume = 0.22;
      music.current = player;
    }
    if (!music.current) return;

    if (musicStarted.current) {
      if (music.current.paused) void music.current.play().catch(() => {});
      return;
    }
    if (musicTimer.current) return;

    musicTimer.current = setTimeout(() => {
      musicTimer.current = undefined;
      if (!music.current || state?.paused) return;
      void music.current.play().then(
        () => {
          musicStarted.current = true;
        },
        () => {
          musicStarted.current = false;
        },
      );
    }, NIGHT_BACKGROUND_MUSIC_DELAY_MS);
  }, [nightBackgroundActive, nightRunId, state?.paused, unlocked]);
  const signature = state ? cueSignature(state) : '';
  useEffect(
    () => () => {
      clearTimeout(finishTimer.current);
      volumeNode.current?.disconnect();
      sources.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      });
      sources.current = [];
      setBusy(false);
    },
    [signature],
  );
  useEffect(() => {
    if (state?.paused) {
      clearTimeout(finishTimer.current);
      volumeNode.current?.disconnect();
      sources.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      });
      sources.current = [];
      setBusy(false);
      return;
    }
    if (
      !state ||
      !unlocked ||
      !context.current ||
      !signature ||
      played.current.has(signature) ||
      ['speaking', 'processing', 'starting'].includes(voiceStatus)
    )
      return;
    const cues = storyCues(state);
    clearTimeout(finishTimer.current);
    volumeNode.current?.disconnect();
    played.current.add(signature);
    played.current.add(`${state.runId}:${state.sceneKey}:${state.shotKey || ''}`);
    if (!cues.length) {
      setBusy(false);
      return;
    }
    sources.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    });
    const volume = context.current.createGain();
    volumeNode.current = volume;
    volume.gain.value = 0.5;
    volume.connect(context.current.destination);
    sources.current = cues.flatMap((cue) => playStoryCue(context.current!, cue, volume));
    setBusy(true);
    const duration = Math.max(...cues.map((cue) => cue.at + cueDuration(cue)));
    finishTimer.current = setTimeout(() => {
      setBusy(false);
      volume.disconnect();
    }, duration * 1000);
  }, [signature, unlocked, state?.paused, voiceStatus]);
  return busy;
}
