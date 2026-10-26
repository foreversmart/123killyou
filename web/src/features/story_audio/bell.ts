type BellMode = readonly [frequency: number, level: number, decay: number];

// Keep the low hum of a large temple bell, with audible upper partials for
// small speakers. A long decay and stable pitch distinguish it from the gong.
const MODES: BellMode[] = [
  [110, 0.46, 1.55],
  [220, 0.55, 1.4],
  [294, 0.32, 1.2],
  [440, 0.65, 1.3],
  [554, 0.4, 1.05],
  [660, 0.3, 0.85],
  [880, 0.22, 0.65],
  [1210, 0.14, 0.4],
];

export function bellSamples(sampleRate: number, duration: number, distant = false): Float32Array {
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  const pitch = distant ? 0.92 : 1;
  let peak = 0;
  for (let index = 0; index < data.length; index++) {
    const time = index / sampleRate;
    let value = 0;
    for (let mode = 0; mode < MODES.length; mode++) {
      const [frequency, level, decay] = MODES[mode];
      const phase = 2 * Math.PI * frequency * pitch * time + mode * 0.41;
      const beating = 0.9 + 0.1 * Math.cos(2 * Math.PI * (0.8 + mode * 0.13) * time);
      value += Math.sin(phase) * level * beating * Math.exp(-time / decay);
    }
    // One clear mallet contact, followed only by sustained metal resonance.
    const strike =
      (Math.sin(2 * Math.PI * 1760 * time) + 0.5 * Math.sin(2 * Math.PI * 2310 * time)) *
      0.24 *
      Math.exp(-time / 0.028);
    const attack = 1 - Math.exp(-time / 0.003);
    const fade = Math.min(1, Math.max(0, (duration - time) / 0.3));
    data[index] = (value + strike) * attack * fade;
    peak = Math.max(peak, Math.abs(data[index]));
  }
  // Distance comes from pitch and resonance, not an inaudible gain. The scene
  // bus applies another 0.5 gain and the bell never overlaps the four gongs.
  if (peak > 0) {
    for (let index = 0; index < data.length; index++) data[index] *= 0.94 / peak;
  }
  return data;
}

const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

export function bellBuffer(
  context: BaseAudioContext,
  duration: number,
  distant = false,
): AudioBuffer {
  let cached = buffers.get(context);
  if (!cached) {
    cached = new Map();
    buffers.set(context, cached);
  }
  const key = `${duration}:${distant}`;
  let buffer = cached.get(key);
  if (!buffer) {
    const data = bellSamples(context.sampleRate, duration, distant);
    buffer = context.createBuffer(1, data.length, context.sampleRate);
    buffer.getChannelData(0).set(data);
    cached.set(key, buffer);
  }
  return buffer;
}
