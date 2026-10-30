import type { GameState } from '@/shared/types/game';

export type V3 = [number, number, number];
export type Material = {
  color: number;
  rough?: number;
  metal?: number;
  pattern?: number;
  glow?: number;
};
export type Geometry = { vertices: Float32Array; indices: Uint32Array };
export type WorldNode = {
  name: string;
  geometry?: Geometry;
  asset?: string;
  surface?: 'stone' | 'bronze';
  position: V3;
  rotation: V3;
  scale: V3;
  children: WorldNode[];
  shadow?: boolean;
  /** Wind response in the vertex shader. Zero keeps rigid architecture stable. */
  wind?: number;
  bend?: { pivot: V3; angle: number };
  animate?: (time: number, delta: number) => void;
};
export type Anchor = { node: WorldNode; offset: V3 };
export type Hotspot = { id: string; name: string; command: string; position: V3; anchor?: Anchor };
export type CameraShot = { eye: V3; target: V3; fov?: number };
export type Lighting = {
  sky: V3;
  ground: V3;
  sun: V3;
  direction: V3;
  fog: number;
  exposure: number;
  daylight: boolean;
  lamps: { position: V3; color: V3; power: number; anchor?: Anchor }[];
  contacts?: { position: V3; radius: number; anchor: Anchor }[];
};
export type World = {
  root: WorldNode;
  hotspots: Hotspot[];
  camera: CameraShot;
  lighting: Lighting;
};
export type WorldMode = 'story' | 'road' | 'alighting' | 'travel' | 'hall';
export type WorldInput = { state: GameState; mode?: WorldMode };

export function node(name: string, geometry?: Geometry): WorldNode {
  return {
    name,
    geometry,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    children: [],
  };
}
