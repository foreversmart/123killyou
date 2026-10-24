export function attachAudioInput(
  context: AudioContext,
  stream: MediaStream,
  ambient: GainNode | null,
  soundOn: boolean,
) {
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  context.createMediaStreamSource(stream).connect(analyser);
  if (!ambient) {
    // Low, filtered room air starts only after the user gesture.
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    ambient = context.createGain();
    ambient.gain.value = soundOn ? 0.018 : 0;
    source.connect(filter).connect(ambient).connect(context.destination);
    source.start();
  }
  return { analyser, ambient };
}
