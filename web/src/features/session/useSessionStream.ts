import { useEffect, useState } from 'react';
import type { GameResult, GameState } from '@/shared/types/game';

export function useSessionStream(
  id: string | undefined,
  acceptState: (state: GameState) => void,
  setError: (error: string) => void,
) {
  const [connectedId, setConnectedId] = useState('');
  useEffect(() => {
    if (!id) return;
    let stopped = false;
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/sessions/${id}/stream`,
      );
      socket = ws;
      ws.onopen = () => {
        if (!stopped) {
          setConnectedId(id);
          setError('');
        }
      };
      ws.onmessage = (event) => {
        if (stopped || socket !== ws) return;
        try {
          acceptState((JSON.parse(event.data) as GameResult).state);
        } catch {
          setError('收到的游戏状态不完整，正在等待重连。');
        }
      };
      ws.onclose = () => {
        if (stopped || socket !== ws) return;
        setConnectedId('');
        retry = setTimeout(connect, 1800);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [id, acceptState, setError]);
  return Boolean(id && connectedId === id);
}
