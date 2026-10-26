type PercussionKind = 'gong' | 'knock' | 'impact';
type Mode = readonly [frequency: number, level: number, decay: number];

// A struck metal plate has uneven modes, unlike a musical bell's clear pitch.
const GONG_MODES: Mode[] = [
  [164, 0.76, 0.76],
  [253.1, 0.57, 1.05],
  [339.2, 0.47, 0.88],
  [487.7, 0.4, 0.7],
  [618.2, 0.33, 0.57],
  [805.8, 0.27, 0.49],
  [1043.3, 0.22, 0.38],
  [1451.8, 0.17, 0.29],
  [1966.2, 0.12, 0.22],
];
const KNOCK_MODES: Mode[] = [
  [116, 0.75, 0.063],
  [224, 0.43, 0.043],
  [382, 0.24, 0.029],
  [798, 0.09, 0.016],
];
// A heavy body hitting the door needs a short, low burst with a blunt tail.
// Its peak is intentionally around 2x the ordinary knock after the scene bus
// gain, while retaining a different spectrum so it cannot be mistaken for a
// deliberate wooden knock.
const IMPACT_MODES: Mode[] = [
  [78, 1.0, 0.16],
  [121, 0.78, 0.12],
  [196, 0.48, 0.085],
  [327, 0.29, 0.06],
  [608, 0.13, 0.038],
];

export function percussionSamples(
  kind: PercussionKind,
  sampleRate: number,
  duration: number,
  distant = false,
): Float32Array {
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  const gong = kind === 'gong';
  const impact = kind === 'impact';
  const modes = gong ? GONG_MODES : impact ? IMPACT_MODES : KNOCK_MODES;
  const pitch = distant ? 0.72 : 1;
  const sustain = gong ? duration / 2.3 : 1;
  let seed = 173,
    lowNoise = 0,
    peak = 0;
  for (let index = 0; index < data.length; index++) {
    const time = index / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const white = (seed / 4294967296) * 2 - 1;
    lowNoise += (1 - Math.exp((-2 * Math.PI * 2600) / sampleRate)) * (white - lowNoise);
    let value = 0;
    for (let mode = 0; mode < modes.length; mode++) {
      const [frequency, level, decay] = modes[mode];
      // The impact briefly raises pitch; nearby modes beat as the plate settles.
      const bend = gong ? 0.0028 * (1 - Math.exp(-time / 0.07)) : 0;
      const phase = 2 * Math.PI * frequency * pitch * (time + bend) + mode * 0.37;
      const shimmer = gong ? 0.86 + 0.14 * Math.cos(2 * Math.PI * (1.1 + mode * 0.31) * time) : 1;
      const damping = distant ? 1 + mode * 0.12 : 1;
      value += Math.sin(phase) * level * shimmer * Math.exp((-time * damping) / (decay * sustain));
    }
    const attack = 1 - Math.exp(-time / (gong ? (distant ? 0.012 : 0.003) : 0.001));
    const strike = gong
      ? (white - lowNoise) * (distant ? 0.18 : 0.7) * Math.exp(-time / 0.035)
      : lowNoise * (impact ? 1.25 : 0.85) * Math.exp(-time / (impact ? 0.028 : 0.012));
    const fade = Math.min(1, Math.max(0, (duration - time) / 0.12));
    data[index] = (value * attack + strike) * fade;
    peak = Math.max(peak, Math.abs(data[index]));
  }
  // Bound each impact before the existing 0.5 scene bus. Even overlapping
  // five-gong tails retain headroom; distant metal stays softer and lower.
  const level = distant ? 0.54 : gong ? 0.88 : impact ? 1.78 : 0.84;
  if (peak > 0) {
    const scale = level / peak;
    for (let index = 0; index < data.length; index++) data[index] *= scale;
  }
  return data;
}

const buffers = new WeakMap<AudioContext, Map<string, AudioBuffer>>();

export function percussionBuffer(
  context: AudioContext,
  kind: PercussionKind,
  duration: number,
  distant = false,
): AudioBuffer {
  let cached = buffers.get(context);
  if (!cached) {
    cached = new Map();
    buffers.set(context, cached);
  }
  const key = `${kind}:${duration}:${distant}`;
  let buffer = cached.get(key);
  if (!buffer) {
    const data = percussionSamples(kind, context.sampleRate, duration, distant);
    buffer = context.createBuffer(1, data.length, context.sampleRate);
    buffer.getChannelData(0).set(data);
    cached.set(key, buffer);
  }
  return buffer;
}
