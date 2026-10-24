export type VoiceStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'hearing'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'unsupported';

export interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}

export interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onnomatch: (() => void) | null;
  onresult:
    ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  }
}
