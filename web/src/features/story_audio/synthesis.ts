import type { SoundEvent } from './cues';

export function playStoryCue(
  context: AudioContext,
  cue: SoundEvent,
  destination: AudioNode,
): AudioScheduledSourceNode[] {
  const starts = context.currentTime + cue.at + 0.03;
  const spatial = context.createStereoPanner();
  spatial.pan.value = cue.pan || 0;
  spatial.connect(destination);
  const sources: AudioScheduledSourceNode[] = [];
  const tone = (frequency: number, duration: number, gain: number, offset = 0) => {
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, starts + offset);
    if (cue.kind === 'bird')
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 1.6,
        starts + offset + duration * 0.5,
      );
    volume.gain.setValueAtTime(0.0001, starts + offset);
    volume.gain.exponentialRampToValueAtTime(gain, starts + offset + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, starts + offset + duration);
    oscillator.connect(volume).connect(spatial);
    oscillator.start(starts + offset);
    oscillator.stop(starts + offset + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
    };
    sources.push(oscillator);
  };
  const noise = (duration: number, gain: number, frequency: number, decay = true) => {
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++)
      data[index] =
        (Math.random() * 2 - 1) *
        (decay ? Math.exp(-index / (data.length / 6)) : Math.sin((Math.PI * index) / data.length));
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    volume.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter).connect(volume).connect(spatial);
    source.start(starts);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
    sources.push(source);
  };
  if (cue.kind === 'gong') {
    const duration = cue.duration || 1.1;
    tone(208, duration * 0.77, 0.12);
    tone(337, duration * 0.64, 0.05);
    tone(551, duration * 0.45, 0.035);
    noise(Math.min(0.3, duration * 0.27), 0.2, 900);
  }
  if (cue.kind === 'bell') {
    tone(93, 3.2, 0.13);
    tone(257, 2.8, 0.06);
    tone(502, 2.1, 0.025);
  }
  if (cue.kind === 'knock') {
    tone(145, 0.13, 0.2);
    tone(282, 0.09, 0.04);
    noise(0.11, 0.25, 460);
  }
  if (cue.kind === 'shatter') {
    noise(1.1, 0.6, 3400);
    [1180, 2070, 3120].forEach((hz, index) => tone(hz, 0.4, 0.04, index * 0.11));
  }
  if (cue.kind === 'bird') {
    tone(1640, 0.16, 0.035);
    tone(1950, 0.12, 0.03, 0.2);
  }
  if (cue.kind === 'door') {
    noise(0.35, 0.5, 180);
    tone(87, 0.3, 0.14);
  }
  if (cue.kind === 'cat') {
    const voice = context.createOscillator();
    const volume = context.createGain();
    voice.type = 'triangle';
    voice.frequency.setValueAtTime(510, starts);
    voice.frequency.linearRampToValueAtTime(760, starts + 0.16);
    voice.frequency.exponentialRampToValueAtTime(330, starts + 0.7);
    volume.gain.setValueAtTime(0.001, starts);
    volume.gain.linearRampToValueAtTime(0.11, starts + 0.12);
    volume.gain.exponentialRampToValueAtTime(0.001, starts + 0.75);
    voice.connect(volume).connect(spatial);
    voice.start(starts);
    voice.stop(starts + 0.8);
    voice.onended = () => {
      voice.disconnect();
      volume.disconnect();
    };
    sources.push(voice);
  }
  if (cue.kind === 'breath') noise(1.4, 0.17, 650, false);
  if (cue.kind === 'scrape') noise(0.9, 0.25, 1900, false);
  if (cue.kind === 'tear') {
    noise(1.25, 0.22, 850, false);
    tone(125, 0.5, 0.025, 0.3);
  }
  if (cue.kind === 'rustle') noise(0.65, 0.12, 2800, false);
  if (cue.kind === 'match') {
    noise(0.4, 0.3, 3800);
    tone(950, 0.08, 0.025);
  }
  if (cue.kind === 'latch') {
    noise(0.25, 0.23, 450);
    tone(183, 0.18, 0.1);
  }
  if (cue.kind === 'step') {
    noise(0.2, 0.2, 300);
    tone(97, 0.12, 0.07);
  }
  if (cue.kind === 'wood') {
    noise(0.12, 0.16, 720);
    tone(440, 0.14, 0.09);
    tone(660, 0.09, 0.035, 0.025);
  }
  if (cue.kind === 'chime') {
    tone(1750, 0.9, 0.07);
    tone(2610, 0.65, 0.025);
  }
  if (cue.kind === 'rooster') {
    [680, 790, 720, 980].forEach((hz, index) =>
      tone(hz, index === 3 ? 0.65 : 0.18, 0.045, index * 0.22),
    );
  }
  if (cue.kind === 'bus') {
    noise(3, 0.3, 180, false);
    tone(53, 3, 0.07);
    tone(109, 2.8, 0.025);
  }
  const remaining = sources.length;
  let ended = 0;
  sources.forEach((source) => {
    const cleanup = source.onended;
    source.onended = (event) => {
      cleanup?.call(source, event);
      if (++ended === remaining) spatial.disconnect();
    };
  });
  return sources;
}
