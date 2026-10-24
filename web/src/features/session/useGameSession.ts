import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult, GameState } from '@/shared/types/game';

import { json } from './api';

type Pending = {
  resolve: (result: GameResult) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function useGameSession() {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<GameState | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<string, Pending>());
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
          const request = result.requestId && pending.current.get(result.requestId);
          if (request) {
            clearTimeout(request.timer);
            pending.current.delete(result.requestId!);
            if (result.type === 'error')
              request.reject(new Error(result.error || '操作未完成，请重试。'));
            else request.resolve(result);
          }
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
      for (const request of pending.current.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('游戏连接已关闭。'));
      }
      pending.current.clear();
    };
  }, [acceptState]);

  const send = useCallback(
    async (text: string) => {
      const origin = current.current;
      if (!origin) throw new Error('房间还没有准备好，请稍等。');
      // Capture the branch for both transports; a retry must never target a later run.
      const command = {
        type: 'command',
        runId: origin.runId,
        requestId: crypto.randomUUID(),
        text,
      };
      const httpFallback = async () => {
        try {
          const result = await json<GameResult>(`/api/sessions/${origin.id}/commands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
          });
          acceptState(result.state);
          return result;
        } catch (cause) {
          // Refresh uncertain progress without delaying feedback or replaying the command.
          void json<GameState>(`/api/sessions/${origin.id}`).then(acceptState, () => {});
          throw cause;
        }
      };
      if (socket.current?.readyState === WebSocket.OPEN) {
        return new Promise<GameResult>((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.current.delete(command.requestId);
            void httpFallback().then(resolve, reject);
          }, 5000);
          pending.current.set(command.requestId, { resolve, reject, timer });
          try {
            socket.current!.send(JSON.stringify(command));
          } catch {
            clearTimeout(timer);
            pending.current.delete(command.requestId);
            void httpFallback().then(resolve, reject);
          }
        });
      }
      return httpFallback();
    },
    [acceptState],
  );

  return { state, connected, error, send };
}
