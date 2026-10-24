const unclearSpeech = '刚才那句话没有听完整，能再说一遍吗？';

// Only observed speech can trigger clarification; silence must stay quiet.
export function createRecognitionFeedback(report: (message: string) => void) {
  let pending = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settle = () => {
    pending = false;
    clearTimeout(timer);
  };
  const unfinished = () => {
    if (disposed || !pending) return;
    settle();
    report(unclearSpeech);
  };
  return {
    heard() {
      if (disposed) return;
      settle();
      pending = true;
      timer = setTimeout(unfinished, 8000);
    },
    settle,
    unfinished,
    unmatched() {
      if (disposed) return;
      settle();
      report(unclearSpeech);
    },
    dispose() {
      settle();
      disposed = true;
    },
  };
}
