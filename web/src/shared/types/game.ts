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
}
