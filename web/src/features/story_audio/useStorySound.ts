import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import type { VoiceStatus } from '@/features/voice/types';
import { cueDuration, cueSignature, storyCues } from './cues';
import {
  DEATH_SOUND_EFFECT,
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
  const deathSound = useRef<HTMLAudioElement | null>(null);
  const deathSoundKey = useRef('');
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
      deathSound.current?.pause();
      deathSound.current = null;
      void context.current?.close();
    };
  }, []);

  const nightBackgroundActive = shouldPlayNightBackground(state);
  const nightRunId = state?.runId || '';
  const deathActive = state?.sceneKey === 'mini_death';
  const bellPlaying = busy && Boolean(state && storyCues(state).some((cue) => cue.kind === 'bell'));
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
    // Keep the whole four-gong / one-bell phrase clear above the chant.
    music.current.volume = bellPlaying ? 0.055 : 0.22;

    if (musicStarted.current) {
      if (music.current.paused) void music.current.play().catch(() => {});
      return;
    }
    if (deathActive && musicTimer.current) {
      clearTimeout(musicTimer.current);
      musicTimer.current = undefined;
    }
    if (musicTimer.current) return;

    musicTimer.current = setTimeout(
      () => {
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
      },
      deathActive ? 0 : NIGHT_BACKGROUND_MUSIC_DELAY_MS,
    );
  }, [
    bellPlaying,
    deathActive,
    nightBackgroundActive,
    nightRunId,
    state?.paused,
    state?.sceneKey,
    unlocked,
  ]);

  const deathKey =
    state?.sceneKey === 'mini_death'
      ? `${state.runId}:${state.shotKey || ''}:${state.retryScene || ''}`
      : '';
  useEffect(() => {
    if (!deathKey) {
      deathSoundKey.current = '';
      deathSound.current?.pause();
      if (deathSound.current) deathSound.current.currentTime = 0;
      return;
    }
    if (!unlocked || state?.paused || typeof Audio === 'undefined') {
      deathSound.current?.pause();
      return;
    }
    if (!deathSound.current) {
      const player = new Audio(DEATH_SOUND_EFFECT);
      player.preload = 'auto';
      player.volume = 0.85;
      deathSound.current = player;
    }
    if (deathSoundKey.current !== deathKey) {
      deathSoundKey.current = deathKey;
      deathSound.current.pause();
      deathSound.current.currentTime = 0;
    }
    void deathSound.current.play().catch(() => {});
  }, [deathKey, state?.paused, unlocked]);

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
    finishTimer.current = setTimeout(
      () => {
        setBusy(false);
        volume.disconnect();
      },
      (duration + 0.06) * 1000,
    );
  }, [signature, unlocked, state?.paused, voiceStatus]);
  return busy;
}
