// Keep context creation and resume in the original user gesture, independent of microphone access.
export function resumeAudioContext(audio: { current: AudioContext | null }): Promise<void> {
  if (!audio.current || audio.current.state === 'closed')
    audio.current = new AudioContext({ sampleRate: 16000 });
  return audio.current.resume();
}
