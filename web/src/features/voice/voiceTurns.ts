type TurnHandlers = {
  process: (text: string) => Promise<string>;
  start: (text: string) => void;
  answer: (text: string) => void;
  problem: (message: string) => void;
};

// A player can interrupt before ASR produces its next final transcript.
// Keep committed actions, but suppress stale speech and errors as soon as they speak.
export function createVoiceTurns(handlers: TurnHandlers) {
  let generation = 0;
  return {
    interrupt() {
      generation++;
    },
    async submit(text: string) {
      const turn = ++generation;
      handlers.start(text);
      try {
        const answer = await handlers.process(text);
        if (turn !== generation) return;
        if (!answer.trim()) throw new Error('听见了，但这次没有收到完整回应。请再说一次。');
        handlers.answer(answer);
      } catch (cause) {
        if (turn !== generation) return;
        handlers.problem(cause instanceof Error ? cause.message : '回应暂时中断，请稍后再说一次。');
      }
    },
  };
}
