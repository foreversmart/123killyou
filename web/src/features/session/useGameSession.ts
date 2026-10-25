import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, TurnControls } from '@/shared/types/game';
import { json } from './api';
import { commandStream } from './commandStream';
import { recognitionStream } from './recognitionStream';
import { createSessionEntry } from './sessionEntry';
import { useSessionStream } from './useSessionStream';

export function useGameSession() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const current = useRef<GameState | null>(null);
  const entry = useRef(createSessionEntry());
  const mounted = useRef(true);
  const acceptState = useCallback((next: GameState) => {
    const previous = current.current;
    if (!next?.id || !previous || next.id !== previous.id || next.revision < previous.revision)
      return;
    current.current = next;
    setState(next);
  }, []);
  const streaming = useSessionStream(state?.id, acceptState, setError);

  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    const boot = async () => {
      try {
        const snapshot = await entry.current.opening();
        if (stopped || current.current?.id) return;
        current.current = snapshot;
        setState(snapshot);
        setError('');
      } catch (cause) {
        if (stopped) return;
        setError(cause instanceof Error ? cause.message : '无法加载第一幕。');
        retry = setTimeout(() => void boot(), 1800);
      }
    };
    void boot();
    return () => {
      stopped = true;
      mounted.current = false;
      clearTimeout(retry);
    };
  }, []);

  const enter = useCallback(async (mode: 'new' | 'resume' = 'new') => {
    if (current.current?.id) return current.current;
    setSelecting(true);
    setError('');
    try {
      const snapshot = await entry.current.enter(mode);
      if (mounted.current && !current.current?.id) {
        current.current = snapshot;
        setState(snapshot);
      }
      return current.current?.id ? current.current : snapshot;
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : '无法开始旅程，请重试。');
      throw cause;
    } finally {
      if (mounted.current) setSelecting(false);
    }
  }, []);

  const send = useCallback(
    async (text: string, controls: Partial<TurnControls> = {}) => {
      const origin = await enter();
      controls.signal?.throwIfAborted();
      const command = { runId: origin.runId, requestId: crypto.randomUUID(), text };
      try {
        return await commandStream(
          `/api/sessions/${origin.id}/commands/stream`,
          command,
          controls,
          (result) => acceptState(result.state),
        );
      } catch (cause) {
        // An interrupted response may have committed just before cancellation.
        void json<GameState>(`/api/sessions/${origin.id}`).then(acceptState, () => {});
        throw cause;
      }
    },
    [acceptState, enter],
  );

  const openTranscription = useCallback(() => {
    const origin = current.current;
    if (!origin?.id) throw new Error('请先开始旅程或继续上次进度。');
    return recognitionStream(
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/sessions/${origin.id}/recognition`,
      origin.runId,
    );
  }, []);
  const opening = Boolean(state && !state.id);
  return {
    state,
    connected: !selecting && (opening || streaming),
    opening,
    selecting,
    error,
    enter,
    send,
    openTranscription,
  };
}
