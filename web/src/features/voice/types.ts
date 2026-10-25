export type VoiceStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'recording'
  | 'hearing'
  | 'transcribing'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'unsupported';

export type VoiceAnswer =
  string | { text: string; streamed?: boolean; problem?: string; sceneOnly?: boolean };
