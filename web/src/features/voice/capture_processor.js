// Standalone AudioWorklet module, also imported by PCM format tests.
export class PCMFrames {
  constructor(rate, emit) {
    this.ratio = rate / 16000;
    this.emit = emit;
    this.frame = new Int16Array(320);
    this.index = this.weight = this.sum = 0;
  }
  push(samples) {
    for (const sample of samples) {
      let left = 1;
      while (left > 0.000001) {
        const used = Math.min(left, this.ratio - this.weight);
        this.sum += sample * used;
        this.weight += used;
        left -= used;
        if (this.weight + 0.000001 < this.ratio) continue;
        const value = Math.max(-1, Math.min(1, this.sum / this.ratio));
        this.frame[this.index++] = Math.round(value * (value < 0 ? 32768 : 32767));
        this.weight = this.sum = 0;
        if (this.index === 320) this.flush();
      }
    }
  }
  flush() {
    if (!this.index) return;
    const bytes = new ArrayBuffer(640),
      view = new DataView(bytes);
    for (let i = 0; i < 320; i++) view.setInt16(i * 2, this.frame[i], true);
    this.emit(bytes);
    this.frame = new Int16Array(320);
    this.index = 0;
  }
}

if (typeof registerProcessor === 'function') {
  class MicrophoneCapture extends AudioWorkletProcessor {
    constructor() {
      super();
      this.encoder = null;
      this.port.onmessage = ({ data }) => {
        if (data.type === 'start') {
          this.id = data.id;
          this.encoder = new PCMFrames(sampleRate, (pcm) =>
            this.port.postMessage({ type: 'frame', id: this.id, pcm }, [pcm]),
          );
        } else if (data.id === this.id) {
          if (data.type === 'stop') this.encoder?.flush();
          this.encoder = null;
          this.port.postMessage({ type: 'stopped', id: this.id });
        }
      };
    }
    process(inputs) {
      if (this.encoder && inputs[0]?.[0]) this.encoder.push(inputs[0][0]);
      return true; // Silent output: microphone samples never reach speakers.
    }
  }
  registerProcessor('microphone-capture', MicrophoneCapture);
}
