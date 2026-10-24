export type Recording = { stop: () => Promise<void>; cancel: () => void };

export async function prepareMicrophone(context: AudioContext, stream: MediaStream) {
  await context.audioWorklet.addModule(new URL('./capture_processor.js', import.meta.url).href);
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, 'microphone-capture');
  source.connect(node).connect(context.destination);
  let generation = 0;
  let active: { id: number; frame: (pcm: ArrayBuffer) => void; stopped?: () => void } | null = null;
  const enable = (enabled: boolean) =>
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  node.port.onmessage = ({ data }) => {
    if (data.id !== active?.id) return;
    if (data.type === 'frame') active?.frame(data.pcm);
    else if (data.type === 'stopped') active?.stopped?.();
  };
  return {
    record(frame: (pcm: ArrayBuffer) => void): Recording {
      if (active) throw new Error('上一段录音尚未关闭。');
      const recording = { id: ++generation, frame, stopped: undefined as (() => void) | undefined };
      active = recording;
      node.port.postMessage({ type: 'start', id: recording.id });
      enable(true);
      return {
        stop() {
          enable(false);
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              if (active === recording) active = null;
              reject(new Error('麦克风停止超时，请重试。'));
            }, 1000);
            recording.stopped = () => {
              clearTimeout(timer);
              if (active === recording) active = null;
              resolve();
            };
            node.port.postMessage({ type: 'stop', id: recording.id });
          });
        },
        cancel() {
          enable(false);
          if (active === recording) active = null;
          recording.stopped?.();
          node.port.postMessage({ type: 'cancel', id: recording.id });
        },
      };
    },
    dispose() {
      enable(false);
      active = null;
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
    },
  };
}
