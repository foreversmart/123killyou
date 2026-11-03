import type { GameState } from '@/shared/types/game';

export type V3 = [number, number, number];
export type V4 = [number, number, number, number];
export type Material = {
  color: number;
  rough?: number;
  metal?: number;
  pattern?: number;
  glow?: number;
};
export type SkinBone = {
  name: string;
  parent: number;
  bind: Float32Array;
  inverseBind: Float32Array;
  position: V3;
};
export type SkinSkeleton = {
  bones: SkinBone[];
  camera?: { bone: number; center: V3 };
};
export type Geometry = {
  vertices: Float32Array;
  indices: Uint32Array;
  vegetation?: Float32Array;
  skin?: { joints: Float32Array; weights: Float32Array; skeleton: SkinSkeleton };
};
export type CharacterTargets = {
  pose: 'standing' | 'seated' | 'kneeling';
  root: WorldNode;
  body: WorldNode;
  head: WorldNode;
  arms: WorldNode[];
  elbows: WorldNode[];
  hands: WorldNode[];
  legs: WorldNode[];
  knees: WorldNode[];
  camera?: WorldNode;
};
export type WorldNode = {
  name: string;
  geometry?: Geometry;
  asset?: string;
  surface?: 'stone' | 'bronze';
  position: V3;
  rotation: V3;
  scale: V3;
  /** Bone sockets override their local transform while retaining animation controls. */
  matrix?: Float32Array;
  skinMatrices?: Float32Array;
  /** Keep a hand-held prop upright while its bone socket moves. */
  upright?: boolean;
  skinTargets?: CharacterTargets & { mesh: WorldNode; skeleton?: SkinSkeleton };
  updateSkin?: () => void;
  children: WorldNode[];
  /** Whether this node contributes geometry to the directional shadow pass. */
  shadow?: boolean;
  /** Render this node only while building the directional shadow map. */
  shadowOnly?: boolean;
  /** Whether the visible pass applies the directional shadow to this node. */
  receiveShadow?: boolean;
  /** Wind response in the vertex shader. Zero keeps rigid architecture stable. */
  wind?: number;
  /** Sample each grass clump root against the mountain terrain before batching. */
  vegetationGround?: boolean;
  vegetationRoad?: boolean;
  /** Keep grass clump roots inside this local-space [minX, minZ, maxX, maxZ] bed. */
  vegetationClip?: [number, number, number, number];
  /** Ghost material intensity inherited by descendant meshes. */
  ghost?: number;
  bend?: { pivot: V3; angle: number };
  /** Actual horizontal travel owns the feet, independently of upper-body clips. */
  gait?: import('@/scene/world_character/distance_gait').DistanceGait;
  /** Seat or mattress support, in root space; replaces the floor correction. */
  pelvisSupportHeight?: number;
  /** Stable actor identity and authored activity, independent of dialogue text. */
  characterKey?: string;
  animationKey?: string;
  /** Per-character origin on the uninterrupted world clock. */
  animationTimeOffset?: number;
  /** Small stateful actions survive a same-place rebuild without restarting. */
  animationState?: { sleepFacing?: number; speech?: { weight: number; time: number } };
  /**
   * A short hand-off used when a visual rebuild keeps the same physical
   * tableau (for example, consecutive shots at the temple gate). The next
   * animation blends from the previous frame instead of snapping to its new
   * authored pose.
   */
  animationContinuity?: {
    position: V3;
    rotationY: number;
    rotation?: V3;
    time: number;
    gait?: import('@/scene/world_character/distance_gait').DistanceGait;
  };
  /** Blender clip selected by the character animation bridge. */
  blenderAction?: string;
  /** Set by the renderer once the GLB animation library is available. */
  blenderEnabled?: boolean;
  /** Existing rigid character nodes driven by a Blender clip. */
  blenderTargets?: CharacterTargets;
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
  /** Camera-independent low cloud volume used by exterior mountain shots. */
  atmosphere: V4;
  /** Half-width of the directional shadow volume, in world metres. */
  shadowRadius?: number;
  lamps: { position: V3; color: V3; power: number; anchor?: Anchor }[];
  contacts?: { position: V3; radius: number; anchor: Anchor }[];
};
export type World = {
  speaker?: string;
  environment?: { key: string; root: WorldNode };
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
