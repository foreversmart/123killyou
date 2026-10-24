import type { GameResult, SpeechEvent, TurnControls } from '@/shared/types/game';

type StreamMessage =
  | GameResult
  | (Omit<GameResult, 'type'> & { type: 'action' })
  | { type: 'speech'; requestId: string; speech: SpeechEvent };

export async function commandStream(
  url: string,
  command: { runId: string; requestId: string; text: string },
  controls: Partial<TurnControls>,
  onState: (result: GameResult) => void,
) {
  const signal = controls.signal
    ? AbortSignal.any([controls.signal, AbortSignal.timeout(25000)])
    : AbortSignal.timeout(25000);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || '游戏服务暂时无法连接，请稍后重试。');
  }
  if (!response.body) throw new Error('没有收到灵矽语音流，请稍后重试。');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let streamed = false;
  const receive = (line: string) => {
    const message = JSON.parse(line) as StreamMessage;
    if (message.requestId !== command.requestId) throw new Error('收到的回合不匹配。');
    if (message.type === 'speech') {
      if (message.speech.kind === 'audio') streamed = true;
      controls.onSpeech?.(message.speech);
      return;
    }
    if (message.type === 'action') {
      const result: GameResult = { ...message, type: 'state' };
      onState(result);
      controls.onAction?.(result);
      return;
    }
    if (message.type !== 'state' && message.type !== 'error')
      throw new Error('收到的游戏回应不完整。');
    onState(message);
    if (message.type === 'error') throw new Error(message.error || '本轮未完成，请重试。');
    return { result: message, streamed };
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw signal.reason;
      pending += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (line.length > 256 * 1024) throw new Error('回应超出大小限制。');
        if (!line) continue;
        const completed = receive(line);
        if (completed) return completed;
      }
      if (pending.length > 256 * 1024) throw new Error('回应超出大小限制。');
      if (done) {
        if (pending.trim()) {
          const completed = receive(pending);
          if (completed) return completed;
        }
        throw new Error('灵矽语音流中断，本轮尚未确认完成，请稍后查看当前情况。');
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
