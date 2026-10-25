export type Point = { x: number; y: number };
export type ActorPlacement = Point & { height?: number; facing?: 'left' | 'right' };
export type PropKind =
  | 'book'
  | 'paper'
  | 'key'
  | 'beads'
  | 'candle'
  | 'lamp'
  | 'bowl'
  | 'bread'
  | 'spoon'
  | 'vase'
  | 'shards'
  | 'cage'
  | 'cups'
  | 'bell'
  | 'bag'
  | 'camera'
  | 'ribbon'
  | 'match'
  | 'latch'
  | 'plate'
  | 'torch'
  | 'sign';
export type StageProp = Point & {
  id: string;
  name: string;
  kind: PropKind;
  command?: string;
  width?: number;
  rotate?: number;
  draw?: boolean;
};
export type StageLayout = {
  chapter: string;
  title: string;
  atmosphere: string;
  daylight?: boolean;
  actors: Record<string, ActorPlacement>;
  props: StageProp[];
};
export type StoryChoice = { thought: string; command: string; tone?: 'quiet' | 'danger' };
