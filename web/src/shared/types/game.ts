export interface Item {
  id: string;
  name: string;
  image: string;
  description: string;
}

export interface GameState {
  id: string;
  runId: string;
  savedAt: string;
  revision: number;
  room: 'watch' | 'corridor';
  roomName: string;
  devotion: number;
  inventory: Item[];
  clues: string[];
  flags: Record<string, boolean>;
  overlay: '' | 'map' | 'journal' | 'inventory' | 'item' | 'ledger' | 'help' | 'settings';
  focusItem: string;
  paused: boolean;
  caught: boolean;
  dialogue: { speaker: string; text: string; portrait: string };
  lastHeard: string;
  lastAction: string;
  effect: { kind: string; strength: number; duration: number };
}

export interface GameResult {
  type: 'state' | 'error';
  requestId?: string;
  state: GameState;
  speak?: string;
  intent?: string;
  error?: string;
  hasAudio?: boolean;
  voiceError?: string;
  speakerId?: string;
}

export interface SpeechEvent {
  kind: 'start' | 'text' | 'audio';
  text?: string;
  pcm?: string;
  sampleRate?: number;
  speaker?: string;
  portrait?: string;
}

export interface SpeechCaption {
  speaker: string;
  portrait: string;
  text: string;
}

export interface TurnControls {
  signal: AbortSignal;
  onSpeech: (event: SpeechEvent) => void;
  onAction?: (result: GameResult) => void;
}

export interface AudioTranscription {
  readonly result: Promise<string>;
  write: (pcm: ArrayBuffer) => void;
  finish: () => Promise<string>;
  cancel: () => void;
}
