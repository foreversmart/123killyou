import type { AudioTranscription } from '@/shared/types/game';

// Send microphone PCM. Cloud credentials never leave the Go service.
export function recognitionStream(url: string, runId: string): AudioTranscription {
  const socket = new WebSocket(url);
  let ready = false,
    released = false,
    settled = false;
  const frames: ArrayBuffer[] = [];
  let queued = 0,
    total = 0;
  let resolve: (text: string) => void;
  let reject: (cause: Error) => void;
  const result = new Promise<string>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  void result.catch(() => {}); // Failure may arrive before the key is released.
  let deadline = setTimeout(() => fail('灵矽语音连接超时，请松开空格重试。'), 8000);
  const cleanup = () => {
    clearTimeout(deadline);
    frames.length = 0;
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    socket.close();
  };
  const fail = (message: string) => {
    if (settled) return;
    settled = true;
    cleanup();
    reject(new Error(message));
  };
  const send = (pcm: ArrayBuffer) => {
    if (socket.bufferedAmount > 128000) {
      fail('语音上传网络拥堵，请按住空格重试。');
      return;
    }
    socket.send(pcm);
  };
  socket.onopen = () => socket.send(JSON.stringify({ type: 'start', runId }));
  socket.onmessage = (event) => {
    if (settled) return;
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'ready') {
        if (ready) throw new Error();
        ready = true;
        if (!released) clearTimeout(deadline);
        for (const frame of frames) {
          if (!settled) send(frame);
        }
        frames.length = 0;
        queued = 0;
        if (released && !settled) socket.send(JSON.stringify({ type: 'stop' }));
      } else if (message.type === 'transcript' && released && typeof message.text === 'string') {
        if ([...message.text].length > 1000) throw new Error();
        settled = true;
        cleanup();
        resolve(message.text.trim());
      } else if (message.type === 'error') fail(message.error || '灵矽语音识别失败，请重试。');
      else throw new Error();
    } catch {
      fail('灵矽语音识别返回不完整，请重试。');
    }
  };
  socket.onerror = () => fail('无法连接灵矽语音识别，请检查游戏服务。');
  socket.onclose = () => fail('灵矽语音识别连接中断，请按住空格重试。');
  return {
    write(pcm) {
      if (settled) throw new Error('语音连接已关闭，请松开空格后重试。');
      if (released) return;
      total += pcm.byteLength;
      if (pcm.byteLength !== 640 || total > 960000) {
        fail('一次最多说三十秒，请分几次说。');
        return;
      }
      if (ready) send(pcm);
      else {
        queued += pcm.byteLength;
        if (queued > 256000) {
          fail('灵矽语音连接超时，请重试。');
          return;
        }
        frames.push(pcm);
      }
    },
    finish() {
      if (!released && !settled) {
        released = true;
        clearTimeout(deadline);
        deadline = setTimeout(() => fail('灵矽还没有识别出这句话，请按住空格重试。'), 12000);
        if (ready) socket.send(JSON.stringify({ type: 'stop' }));
      }
      return result;
    },
    cancel() {
      fail('本次录音已取消。');
    },
  };
}
