import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import type { VoiceStatus } from '@/features/voice/types';
import { cueDuration, cueSignature, storyCues } from './cues';
import { playStoryCue } from './synthesis';

export function useStorySound(state: GameState | null, soundOn: boolean, voiceStatus: VoiceStatus) {
  const context = useRef<AudioContext | null>(null);
  const sources = useRef<AudioScheduledSourceNode[]>([]);
  const played = useRef(new Set<string>());
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const volumeNode = useRef<GainNode | null>(null);
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
      sources.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      });
      void context.current?.close();
    };
  }, []);
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
    if (!soundOn || state?.paused) {
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
  }, [signature, soundOn, unlocked, state?.paused, voiceStatus]);
  return busy;
}
