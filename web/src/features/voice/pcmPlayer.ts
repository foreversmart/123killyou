// Schedule mono PCM16 chunks on the audio clock without waiting for a WAV file.
export function createPCMPlayer(context: AudioContext, sampleRate: number, onEnd: () => void) {
  if (sampleRate !== 16000 && sampleRate !== 24000)
    throw new Error('灵矽返回了不支持的音频采样率。');
  const sources = new Set<AudioBufferSourceNode>();
  let pending: Float32Array[] = [];
  let frames = 0;
  let total = 0;
  let nextAt = 0;
  let finished = false;
  let stopped = false;
  const flush = () => {
    if (!frames || stopped) return;
    const buffer = context.createBuffer(1, frames, sampleRate);
    const data = buffer.getChannelData(0);
    let offset = 0;
    for (const chunk of pending) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    pending = [];
    frames = 0;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      source.disconnect();
      sources.delete(source);
      if (finished && !stopped && sources.size === 0) {
        stopped = true;
        onEnd();
      }
    };
    sources.add(source);
    const startAt = Math.max(context.currentTime + 0.025, nextAt);
    nextAt = startAt + buffer.duration;
    source.start(startAt);
  };
  return {
    get received() {
      return total > 0;
    },
    get playing() {
      return sources.size > 0;
    },
    get remaining() {
      return Math.max(0, nextAt - context.currentTime) + frames / sampleRate;
    },
    push(bytes: Uint8Array) {
      if (stopped || finished) return;
      if (bytes.length % 2) throw new Error('灵矽返回了不完整的音频采样。');
      if (total + bytes.length / 2 > sampleRate * 70)
        throw new Error('灵矽返回的音频超出时长限制。');
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const chunk = new Float32Array(bytes.length / 2);
      for (let i = 0; i < chunk.length; i++) chunk[i] = view.getInt16(i * 2, true) / 32768;
      pending.push(chunk);
      frames += chunk.length;
      total += chunk.length;
      // A small jitter buffer absorbs uneven network delivery.
      if (frames >= sampleRate * 0.12) flush();
    },
    finish() {
      if (stopped || finished) return;
      finished = true;
      flush();
      if (sources.size === 0) {
        stopped = true;
        onEnd();
      }
    },
    stop() {
      if (stopped) return;
      stopped = true;
      pending = [];
      frames = 0;
      for (const source of sources) {
        source.onended = null;
        source.stop();
        source.disconnect();
      }
      sources.clear();
    },
  };
}
