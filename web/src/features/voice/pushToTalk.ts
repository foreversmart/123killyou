import type { AudioTranscription } from '@/shared/types/game';
import type { VoiceStatus } from './types';
import type { Recording } from './microphoneCapture';

type Handlers = {
  open: () => AudioTranscription;
  record: (frame: (pcm: ArrayBuffer) => void) => Recording;
  interrupt: () => void;
  status: (status: VoiceStatus) => void;
  submit: (text: string) => void;
  problem: (message: string) => void;
};
type Take = {
  held: boolean;
  voiced: number;
  connection?: AudioTranscription;
  recording?: Recording;
};

// One physical hold produces at most one cloud STT result and one game turn.
export function createPushToTalk(handlers: Handlers) {
  let take: Take | null = null,
    disposed = false;
  let startTimer: ReturnType<typeof setTimeout>, limitTimer: ReturnType<typeof setTimeout>;
  const cancel = () => {
    clearTimeout(startTimer);
    clearTimeout(limitTimer);
    const previous = take;
    take = null;
    previous?.recording?.cancel();
    previous?.connection?.cancel();
  };
  const problem = (current: Take, cause: unknown) => {
    if (take !== current) return;
    cancel();
    handlers.problem(cause instanceof Error ? cause.message : '语音识别中断，请按住空格重试。');
  };
  const finish = async (current: Take) => {
    try {
      await current.recording?.stop();
      if (take !== current) return;
      if (!current.connection || current.voiced < 3) {
        cancel();
        handlers.status('listening');
        return;
      }
      const text = (await current.connection.finish()).trim();
      if (take !== current) return;
      cancel(); // Close microphone input before starting the reply turn.
      if (text) handlers.submit(text);
      else handlers.problem('刚才那句话没有识别清楚，请按住空格再说一遍。');
    } catch (cause) {
      problem(current, cause);
    }
  };
  return {
    get holding() {
      return take?.held || false;
    },
    press() {
      if (disposed || take?.held) return;
      cancel();
      handlers.interrupt();
      handlers.status('recording');
      const current: Take = { held: true, voiced: 0 };
      take = current;
      startTimer = setTimeout(() => {
        if (take !== current || !current.held) return;
        try {
          current.connection = handlers.open();
          current.recording = handlers.record((pcm) => {
            if (take !== current) return;
            try {
              const view = new DataView(pcm);
              let energy = 0;
              for (let i = 0; i < view.byteLength; i += 2)
                energy += (view.getInt16(i, true) / 32768) ** 2;
              if (Math.sqrt(energy / (view.byteLength / 2)) > 0.008) current.voiced++;
              current.connection!.write(pcm);
            } catch (cause) {
              problem(current, cause);
            }
          });
        } catch (cause) {
          problem(current, cause);
        }
      }, 120);
      limitTimer = setTimeout(
        () => problem(current, new Error('一次最多说三十秒，请分几次按住空格说。')),
        30000,
      );
    },
    release() {
      if (!take?.held || disposed) return;
      const current = take;
      current.held = false;
      clearTimeout(startTimer);
      clearTimeout(limitTimer);
      handlers.status('transcribing');
      void finish(current);
    },
    cancel() {
      if (take) {
        cancel();
        handlers.status('listening');
      }
    },
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
