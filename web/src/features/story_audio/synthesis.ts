import type { SoundEvent } from './cues';

export function playStoryCue(
  context: AudioContext,
  cue: SoundEvent,
  destination: AudioNode,
): AudioScheduledSourceNode[] {
  const starts = context.currentTime + cue.at + 0.03;
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
    oscillator.connect(volume).connect(destination);
    oscillator.start(starts + offset);
    oscillator.stop(starts + offset + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
    };
    sources.push(oscillator);
  };
  const noise = (duration: number, gain: number, frequency: number) => {
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++)
      data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (data.length / 6));
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    volume.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter).connect(volume).connect(destination);
    source.start(starts);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
    sources.push(source);
  };
  if (cue.kind === 'gong') {
    tone(208, 0.85, 0.12);
    tone(337, 0.7, 0.05);
    tone(551, 0.5, 0.035);
    noise(0.3, 0.2, 900);
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
  return sources;
}
