// Keep context creation and resume in the original user gesture, independent of microphone access.
let primedAudio: AudioContext | null = null;

export function primeAudioContext(): Promise<void> {
  if (!primedAudio || primedAudio.state === 'closed')
    primedAudio = new AudioContext({ sampleRate: 16000 });
  return primedAudio.resume();
}

export function resumeAudioContext(audio: { current: AudioContext | null }): Promise<void> {
  if (!audio.current || audio.current.state === 'closed') {
    audio.current = primedAudio || new AudioContext({ sampleRate: 16000 });
    primedAudio = null;
  }
  return audio.current.resume();
}
