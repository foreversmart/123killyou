import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult, GameState, TurnControls } from '@/shared/types/game';

import { json } from './api';
import { commandStream } from './commandStream';
import { recognitionStream } from './recognitionStream';

export function useGameSession() {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<GameState | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const acceptState = useCallback((next: GameState) => {
    if (!next?.id) return;
    const previous = current.current;
    if (previous && (next.id !== previous.id || next.revision < previous.revision)) return;
    current.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (stopped || !current.current) return;
      const ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/sessions/${current.current.id}/stream`,
      );
      socket.current = ws;
      ws.onopen = () => {
        if (!stopped) {
          setConnected(true);
          setError('');
        }
      };
      ws.onmessage = (event) => {
        if (stopped || socket.current !== ws) return;
        try {
          const result = JSON.parse(event.data) as GameResult;
          acceptState(result.state);
        } catch {
          setError('收到的游戏状态不完整，正在等待重连。');
        }
      };
      ws.onclose = () => {
        if (stopped || socket.current !== ws) return;
        setConnected(false);
        retry = setTimeout(connect, 1800);
      };
      ws.onerror = () => ws.close();
    };
    const boot = async () => {
      try {
        // The backend owns the autosave slot; a fresh browser needs no storage token.
        const snapshot = await json<GameState>('/api/sessions/resume', {
          method: 'POST',
        });
        if (stopped) return;
        current.current = snapshot;
        setState(snapshot);
        setError('');
        connect();
      } catch (cause) {
        if (!stopped) {
          setError(cause instanceof Error ? cause.message : '无法读取本地存档。');
          retry = setTimeout(() => void boot(), 1800);
        }
      }
    };
    void boot();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [acceptState]);

  const send = useCallback(
    async (text: string, controls: Partial<TurnControls> = {}) => {
      const origin = current.current;
      if (!origin) throw new Error('房间还没有准备好，请稍等。');
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
    [acceptState],
  );

  const openTranscription = useCallback(() => {
    const origin = current.current;
    if (!origin) throw new Error('房间还没有准备好，请稍等。');
    return recognitionStream(
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/sessions/${origin.id}/recognition`,
      origin.runId,
    );
  }, []);
  return { state, connected, error, send, openTranscription };
}
